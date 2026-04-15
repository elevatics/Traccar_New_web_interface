import traccarClient from "./traccarClient";

const asArray = (value) => (Array.isArray(value) ? value : []);

export const traccarRequest = async ({
  method = "get",
  url,
  data,
  params,
  config = {},
}) => {
  const response = await traccarClient.request({
    method,
    url,
    data,
    params,
    ...config,
  });

  return response.data;
};

export const traccarGet = (url, options = {}) =>
  traccarRequest({ method: "get", url, ...options });

export const traccarPost = (url, data, options = {}) =>
  traccarRequest({ method: "post", url, data, ...options });

export const traccarPut = (url, data, options = {}) =>
  traccarRequest({ method: "put", url, data, ...options });

export const traccarDelete = (url, options = {}) =>
  traccarRequest({ method: "delete", url, ...options });

export const traccarGetCollection = async ({
  url,
  params,
  normalize = (item) => item,
  emptyMessage,
}) => {
  const data = await traccarGet(url, { params });
  const collection = asArray(data);

  if (collection.length === 0 && emptyMessage) {
    console.warn(emptyMessage);
  }

  return collection.map(normalize);
};

