import { ScanRegion } from "./components/Scanner";

const defaultTemplate = `{
  "ImageParameter" :  {
      "BarcodeFormatIds" : ["BF_QR_CODE"],
      "Name" : "Settings", 
      "Timeout": 5000,
      "RegionDefinitionNameArray": [],
      "ExpectedBarcodesCount": 4
  },
  "RegionDefinitionArray": [],
  "Version" : "3.0"
}`

export function getTemplate(scanRegions?:ScanRegion[]) {
  if (scanRegions) {
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