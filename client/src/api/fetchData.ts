// fetchData.ts
import * as xml2js from "xml2js";

export const fetchXmlDataAsJson = async (url: string, init?: RequestInit): Promise<any> => {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const xml = await response.text();
    const json = await parseXmlToJson(xml);
    return json;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching data: ${error}`);
    throw error;
  }
};

const parseXmlToJson = (xml: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
