"use server"

import {GetWFSCapabilitiesResponse, GetWMSCapabilitiesResponse} from "@/interfaces";
import {GetWMTSCapabilitiesResponse} from "@/interfaces/getWMTSCapabilitiesResponse";
import {getWfsData, getWmsData, getWmtsData} from "@/services";
import {cookies, headers} from "next/headers";
import {getToken} from "next-auth/jwt";

const wmwsQuery = "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities";
const wfsQuery = "?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetCapabilities";
const wmtsQuery = "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";

const AUTHENTICATED_PREFIXES = process.env.AUTHENTICATED_PREFIXES ? process.env.AUTHENTICATED_PREFIXES.split(",") : [];

export const loadWMSCapabilities= async (url: string): Promise<GetWMSCapabilitiesResponse> => {
  const modifiedUrl = modifyUrlQuery(url, wmwsQuery);
  return await getWmsData(modifiedUrl, await getRequestInit(url));
};

export const loadWFSCapabilities = async (url: string): Promise<GetWFSCapabilitiesResponse> => {
  const modifiedUrl = modifyUrlQuery(url, wfsQuery);
  return await getWfsData(modifiedUrl, await getRequestInit(url));
};

export const loadWMTSCapabilities = async (url: string): Promise<GetWMTSCapabilitiesResponse> => {
  const modifiedUrl = modifyUrlQuery(url, wmtsQuery);
  return await getWmtsData(modifiedUrl, await getRequestInit(url));
};

function modifyUrlQuery(url: string, newQuery: string): string {
  const urlParts = url.split("?");
  return `${urlParts[0]}${newQuery}`;
}

async function getRequestInit(url: string): Promise<RequestInit | undefined> {
  if (AUTHENTICATED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    const jwt = await getToken({
      req: {
        cookies: cookies(),
        headers: headers(),
      } as any
    });
    if (!jwt || jwt.access_token === null || jwt.access_token === undefined) {
      throw new Error("Unauthorized");
    }
    return {
      headers: {
        "Authorization": "Bearer " + jwt.access_token
      }
    } satisfies RequestInit;
  }
  return undefined;
}
