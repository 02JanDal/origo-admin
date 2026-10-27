export class GISRequestAnalyzer {
  static identifyService(url: string): string | null {
    const lowerUrl = url.toLowerCase();

    switch (true) {
      case lowerUrl.includes("service=wfs"):
        return "WFS";
      case lowerUrl.includes("service=wms"):
        return "WMS";
      case lowerUrl.includes("service=wmts"):
        return "WMTS";
      default:
        return null;
    }
  }

  static getSource(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Include the full path up to the last segment before the query string
      const pathSegments = parsedUrl.pathname.split("/");
      const servicePath = pathSegments.slice(0, -1).join("/");
      return `${parsedUrl.protocol}//${parsedUrl.hostname}${servicePath}`;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error parsing URL:`, error);
      return "unknown";
    }
  }

  static parseWFSRequest(url: string): { service: string; typeName: string | null; source: string } {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);

    let typeName = params.get("typename") || params.get("typeName");

    if (typeName && typeName.includes(",")) {
      typeName = typeName.split(",")[0].trim();
    }

    return {
      service: "WFS",
      typeName: typeName,
      source: this.getSource(url),
    };
  }

  static parseWMSRequest(url: string): { service: string; layers: string[]; source: string } {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);

    let layers = params.get("layers") || params.get("LAYERS");
    let layerList: string[] = [];

    if (layers) {
      layerList = layers.split(",").map((layer) => layer.trim());
    }

    return {
      service: "WMS",
      layers: layerList,
      source: this.getSource(url),
    };
  }

  static parseWMTSRequest(url: string): { service: string; layer: string | null; source: string } {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);

    let layer = params.get("layer") || params.get("LAYER");

    return {
      service: "WMTS",
      layer: layer,
      source: this.getSource(url),
    };
  }

  static parseRequest(url: string): {
    service: string | null;
    layerName: string | null;
    layers?: string[];
    source: string;
  } {
    const service = this.identifyService(url);
    const source = this.getSource(url);

    switch (service) {
      case "WFS":
        const wfsData = this.parseWFSRequest(url);
        return { ...wfsData, layerName: wfsData.typeName };
      case "WMS":
        const wmsData = this.parseWMSRequest(url);
        return {
          ...wmsData,
          layerName: wmsData.layers[0] || null,
        };
      case "WMTS":
        const wmtsData = this.parseWMTSRequest(url);
        return { ...wmtsData, layerName: wmtsData.layer };
      default:
        return { service: null, layerName: null, source };
    }
  }
}
