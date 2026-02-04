/* eslint-disable no-console */
import { BuildConfig } from "bun";
import { watch, type WatchEventType } from "fs";
import path from "path";

const isDev = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch");

const commonConfig: Partial<BuildConfig> = {
	minify: !isDev,
	sourcemap: isDev ? "inline" : "external",
	target: "browser",
};

// Map Bundle (main app)
const mapBundle: BuildConfig = {
	...commonConfig,
	entrypoints: ["./Scripts/app.ts"],
	outdir: "./wwwroot/js",
	naming: "[dir]/bundle.[ext]",
};

// Management Bundle
const managementBundle: BuildConfig = {
	...commonConfig,
	entrypoints: ["./Scripts/Management/management.ts"],
	outdir: "./wwwroot/js/management",
	naming: "[dir]/management.[ext]",
};

// Theme Switcher Bundle
const themeSwitcherBundle: BuildConfig = {
	...commonConfig,
	entrypoints: ["./Scripts/ThemeSwitcher.ts"],
	outdir: "./wwwroot/js",
	naming: "[dir]/ThemeSwitcher.[ext]",
	format: "iife",
};

async function build(): Promise<boolean> {
	const startTime = performance.now();
	console.log(`Building in ${isDev ? "development" : "production"} mode...`);

	const results = await Promise.all([
		Bun.build(mapBundle),
		Bun.build(managementBundle),
		Bun.build(themeSwitcherBundle),
	]);

	let hasErrors = false;
	for (const result of results) {
		if (!result.success) {
			hasErrors = true;
			console.error("Build failed:");
			for (const log of result.logs) {
				console.error(log);
			}
		}
	}

	if (hasErrors) {
		return false;
	}

	const duration = (performance.now() - startTime).toFixed(0);
	console.log(`✅ Build complete in ${duration}ms`);
	return true;
}

if (isWatch) {
	console.log("👀 Watching for changes in ./Scripts...");

	const scriptsPath = path.resolve("./Scripts");
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let isBuilding = false;
	let buildQueued = false;

	async function triggerBuild(): Promise<void> {
		if (isBuilding) {
			// Queue another build after current one finishes
			buildQueued = true;
			return;
		}

		isBuilding = true;
		await build();
		isBuilding = false;

		// If a build was queued while we were building, trigger another
		if (buildQueued) {
			buildQueued = false;
			console.log("\n📝 Changes detected during build, rebuilding...");
			await triggerBuild();
		}
	}

	const handleFileChange = (event: WatchEventType, filename: string | null) => {
		// Only trigger on TypeScript files
		if (!filename?.endsWith(".ts") && !filename?.endsWith(".tsx")) {
			return;
		}

		// Clear any pending debounce timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Debounce: wait 100ms after last change before triggering build
		debounceTimer = setTimeout(() => {
			console.log(`\n📝 ${filename} changed, rebuilding...`);
			triggerBuild();
		}, 100);
	};

	// Start watching with recursive option
	watch(scriptsPath, { recursive: true }, handleFileChange);

	// Initial build
	const success = await build();
	if (!success) {
		console.log("⚠️  Initial build had errors. Waiting for changes...");
	}

	// Keep process alive and handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n👋 Stopping watch mode...");
		process.exit(0);
	});
} else {
	const success = await build();
	if (!success) {
		process.exit(1);
	}
}