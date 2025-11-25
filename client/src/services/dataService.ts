import { fetchXmlDataAsJson } from "@/api";
import { GetWFSCapabilitiesResponse, GetWMSCapabilitiesResponse, WFSLayerData, WMSLayerData } from "@/interfaces";
import { GetWMTSCapabilitiesResponse, WMTSLayerData } from "@/interfaces/getWMTSCapabilitiesResponse";

export const getWmsData = async (url: string, init?: RequestInit): Promise<GetWMSCapabilitiesResponse> => {
  try {
    const response = await fetchXmlDataAsJson(url, init);
    return formatWMSResponse(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching data: ${error}`);
    throw error;
  }
};

const formatWMSResponse = (response: any): GetWMSCapabilitiesResponse => {
  const capabilities = response.WMS_Capabilities.Capability[0];
  let layerDataArray: WMSLayerData[] = [];

  const gatherLayers = (layers: any[]) => {
    layers.forEach((layer) => {
      if (layer.Layer) {
        let extractedLayer = extractWMSLayerData(layer);
        extractedLayer.Title += " (Grupp)";
        layerDataArray.push(extractedLayer);

        gatherLayers(layer.Layer);
      } else {
        let extractedLayer = extractWMSLayerData(layer);
        layerDataArray.push(extractedLayer);
      }
    });
  };

  gatherLayers(capabilities.Layer);

  return {
    Layers: layerDataArray,
  };
};
const extractWMSLayerData = (layer: any): WMSLayerData => {
  const styleUrl = layer.Style?.[0]?.LegendURL?.[0]?.OnlineResource?.[0]?.$?.["xlink:href"] || "";
  const dataUrl = layer.DataURL?.[0]?.OnlineResource?.[0]?.$?.["xlink:href"] || "";

  return {
    Name: layer.Name ? layer.Name[0] : "",
    Title: layer.Title ? layer.Title[0] : "",
    Queryable: layer.$ ? layer.$.queryable === "1" : false,
    Attribution: layer.Attribution ? layer.Attribution[0].Title[0] : "",
    Abstract: layer.Abstract ? layer.Abstract[0] : "",
    Format: "image/png",
    Style: styleUrl,
    DataUrl: dataUrl,
  };
};

export const getWfsData = async (url: string, init?: RequestInit): Promise<GetWFSCapabilitiesResponse> => {
  try {
    const response = await fetchXmlDataAsJson(url, init);
    return formatWFSResponse(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching data: ${error}`);
    throw error;
  }
};

interface ElementAttributes {
  maxOccurs?: string;
  minOccurs?: string;
  name: string;
  type?: string;
  nillable?: boolean;
}

interface Sequence {
  element: ElementAttributes[] | ElementAttributes;
}

interface Extension {
  $?: { base: string };
  sequence?: Sequence;
}

interface ComplexContent {
  extension: Extension[] | Extension;
}

interface ComplexType {
  $: { name: string };
  complexContent: ComplexContent;
}

export const getDescribeFeatureTypes = async (url: string): Promise<Record<string, [string, string][]>> => {
  try {
    const response = await fetchXmlDataAsJson(url);
    return mapElementsToRecord(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching data: ${error}`);
    throw error;
  }
};
function mapElementsToRecord(data: any): Record<string, [string, string][]> {
  const elementsRecord: Record<string, [string, string][]> = {};

  const elements = data.schema.element;
  const complexTypes = data.schema.complexType;

  const typeNameToElementName: Record<string, string> = {};
  elements.forEach((element: any) => {
    if (element.$.type && element.$.name) {
      typeNameToElementName[element.$.type] = element.$.name;
    }
  });

  complexTypes.forEach((complexType: any) => {
    const elementName = typeNameToElementName[`qgs:${complexType.$.name}`];
    if (elementName) {
      if (!elementsRecord[elementName]) {
        elementsRecord[elementName] = [];
      }
      const sequences = complexType?.complexContent?.[0]?.extension?.[0]?.sequence;
      if (sequences && sequences[0]?.element) {
        sequences[0].element.forEach((el: any) => {
          const elName = el.$?.name;
          const elType = el.$?.type;
          if (elName && elType) {
            elementsRecord[elementName].push(["name", elName]);
          }
        });
      }
    }
  });

  return elementsRecord;
}

const formatWFSResponse = (response: any): GetWFSCapabilitiesResponse => {
  const featureTypes = response.WFS_Capabilities.FeatureTypeList[0].FeatureType;
  let layerDataArray: WFSLayerData[] = [];
  const gatherFeatureTypes = (featureTypes: any[]) => {
    featureTypes.forEach((featureType) => {
      let extractedLayer = extractWFSLayerData(featureType);
      layerDataArray.push(extractedLayer);
    });
  };

  gatherFeatureTypes(featureTypes);

  return {
    Layers: layerDataArray,
  };
};

const extractWFSLayerData = (layer: any): WFSLayerData => {
  return {
    Name: layer.Name ? layer.Name[0] : "",
    Title: layer.Title ? layer.Title[0] : "",
    Abstract: layer.Abstract ? layer.Abstract[0] : "",
  };
};

export const getWmtsData = async (url: string, init?: RequestInit): Promise<GetWMTSCapabilitiesResponse> => {
  try {
    const response = await fetchXmlDataAsJson(url, init);
    return formatWMTSResponse(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching data: ${error}`);
    throw error;
  }
};

const formatWMTSResponse = (response: any): GetWMTSCapabilitiesResponse => {
  const layers = response.Capabilities.Contents[0].Layer;
  let layerDataArray: WMTSLayerData[] = [];
  const gatherLayers = (layers: any[]) => {
    layers.forEach((layer) => {
      let extractedLayer = extractWMTSLayerData(layer);
      layerDataArray.push(extractedLayer);
    });
  };

  gatherLayers(layers);

  return {
    Layers: layerDataArray,
  };
};

interface WMTSLayer {
  "ows:Identifier": string[];
  "ows:Title": string[];
  Format: string;
  "ows:Abstract": string[];
}

const extractWMTSLayerData = (layer: WMTSLayer): WMTSLayerData => {
  return {
    Name: layer["ows:Identifier"]?.[0] ?? "",
    Title: layer["ows:Title"]?.[0] ?? "",
    Abstract: layer["ows:Abstract"]?.[0] ?? "",
    Format: layer.Format[0] ?? "",
  };
};
