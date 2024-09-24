import { ScanRegion } from "./components/Scanner";

const defaultTemplate = `{
  "ImageParameter" :  {
      "BarcodeFormatIds" : ["BF_QR_CODE"],
      "Name" : "MultiRegions", 
      "Timeout": 5000,
      "RegionDefinitionNameArray": [],
      "ExpectedBarcodesCount": 4
  },
  "RegionDefinitionArray": [],
  "Version" : "3.0"
}`

export function getTemplate(config:{scanRegions?:ScanRegion[],rotated:boolean}) {
  if (config.scanRegions) {
    let scanRegions = JSON.parse(JSON.stringify(config.scanRegions));
    if (config.rotated === true) {
      for (let index = 0; index < scanRegions.length; index++) {
        const region = scanRegions[index];
        let left = region.left;
        let width = region.width;
        region.left = region.top;
        region.width = region.height;
        region.top = left;
        region.height = width
      }
    }
    let template = JSON.parse(defaultTemplate);
    for (let index = 0; index < scanRegions.length; index++) {
      const scanRegion = scanRegions[index];
      template["RegionDefinitionArray"].push(
        {
          "Name":"scanregion"+index,
          "MeasuredByPercentage":0,
          "Top":Math.ceil(scanRegion.top),
          "Left":Math.ceil(scanRegion.left),
          "Bottom":Math.ceil(scanRegion.top+scanRegion.height),
          "Right":Math.ceil(scanRegion.left+scanRegion.width)
        }
      )
      template["ImageParameter"]["RegionDefinitionNameArray"].push("scanregion"+index)
    }
    return JSON.stringify(template,null,4);
  }else{
    return defaultTemplate;
  }
}