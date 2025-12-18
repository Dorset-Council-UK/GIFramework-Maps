/* eslint-disable no-console */
import { BuildConfig } from "bun";
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

async function build() {
	console.log(`Building in ${isDev ? "development" : "production"} mode...`);

	const results = await Promise.all([
		Bun.build(mapBundle),
		Bun.build(managementBundle),
		Bun.build(themeSwitcherBundle),
	]);

	for (const result of results) {
		if (!result.success) {
			console.error("Build failed:");
			for (const log of result.logs) {
				console.error(log);
			}
			process.exit(1);
		}
	}

	console.log("✅ Build complete!");
}

if (isWatch) {
	console.log("👀 Watching for changes...");
	// Bun doesn't have built-in watch for builds yet, use a simple approach
	const { watch } = await import("fs");
	const scriptsPath = path.resolve("./Scripts");

	watch(scriptsPath, { recursive: true }, async (event, filename) => {
		if (filename?.endsWith(".ts")) {
			console.log(`\n📝 ${filename} changed, rebuilding...`);
			await build();
		}
	});

	// Initial build
	await build();
} else {
	await build();
}