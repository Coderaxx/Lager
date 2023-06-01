export const { ComputerVisionClient } = (await import("https://cdn.jsdelivr.net/npm/@azure/cognitiveservices-computervision@8.2.0/dist/cognitiveservices-computervision.min.js")).ComputerVisionClient;

export const { ApiKeyCredentials } = (await import("https://cdn.jsdelivr.net/npm/@azure/ms-rest-js@2.6.6/dist/msRest.node.min.js")).ApiKeyCredentials;

export const axios = (await import("https://cdn.jsdelivr.net/npm/axios@1.4.0/dist/axios.min.js")).default;

export const { v4 } = await import("https://cdn.jsdelivr.net/npm/uuid@9.0.0/dist/index.min.js");