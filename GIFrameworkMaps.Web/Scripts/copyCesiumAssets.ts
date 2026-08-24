import { cp } from "fs/promises";

const cesiumSource = "./node_modules/cesium/Build/Cesium";
const cesiumOutput = "./wwwroot/js/cesium";

for (const assetDirectory of ["Workers", "Assets", "Widgets", "ThirdParty"]) {
  await cp(`${cesiumSource}/${assetDirectory}`, `${cesiumOutput}/${assetDirectory}`, {
    recursive: true,
    force: true,
  });
}
