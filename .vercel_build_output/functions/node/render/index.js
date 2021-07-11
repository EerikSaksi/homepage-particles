var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* read(parts) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else {
      yield part;
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    if (isBlob(value)) {
      length += value.size;
    } else {
      length += Buffer.byteLength(String(value));
    }
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = body.stream();
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const err = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(err);
        throw err;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error3) {
    if (error3 instanceof FetchBaseError) {
      throw error3;
    } else {
      throw new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error3.message}`, "system", error3);
    }
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error3) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error3.message}`, "system", error3);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = src(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error3 = new AbortError("The operation was aborted.");
      reject(error3);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error3);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error3);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (err) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, "system", err));
      finalize();
    });
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              try {
                headers.set("Location", locationURL);
              } catch (error3) {
                reject(error3);
              }
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
        }
      }
      response_.once("end", () => {
        if (signal) {
          signal.removeEventListener("abort", abortAndFinalize);
        }
      });
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error3) => {
        reject(error3);
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), (error3) => {
          reject(error3);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error3) => {
          reject(error3);
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), (error3) => {
              reject(error3);
            });
          } else {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), (error3) => {
              reject(error3);
            });
          }
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), (error3) => {
          reject(error3);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, src, Readable, wm, Blob2, fetchBlob, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    src = dataUriToBuffer;
    ({ Readable } = import_stream.default);
    wm = new WeakMap();
    Blob2 = class {
      constructor(blobParts = [], options2 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let buffer;
          if (element instanceof Buffer) {
            buffer = element;
          } else if (ArrayBuffer.isView(element)) {
            buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
          } else if (element instanceof ArrayBuffer) {
            buffer = Buffer.from(element);
          } else if (element instanceof Blob2) {
            buffer = element;
          } else {
            buffer = Buffer.from(typeof element === "string" ? element : String(element));
          }
          size += buffer.length || buffer.size || 0;
          return buffer;
        });
        const type = options2.type === void 0 ? "" : String(options2.type).toLowerCase();
        wm.set(this, {
          type: /[^\u0020-\u007E]/.test(type) ? "" : type,
          size,
          parts
        });
      }
      get size() {
        return wm.get(this).size;
      }
      get type() {
        return wm.get(this).type;
      }
      async text() {
        return Buffer.from(await this.arrayBuffer()).toString();
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of this.stream()) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        return Readable.from(read(wm.get(this).parts));
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = wm.get(this).parts.values();
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            const chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
            blobParts.push(chunk);
            added += ArrayBuffer.isView(chunk) ? chunk.byteLength : chunk.size;
            relativeStart = 0;
            if (added >= span) {
              break;
            }
          }
        }
        const blob = new Blob2([], { type: String(type).toLowerCase() });
        Object.assign(wm.get(blob), { size: span, parts: blobParts });
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.stream === "function" && object.stream.length === 0 && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(Blob2.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    fetchBlob = Blob2;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && object[NAME] === "AbortSignal";
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (err) => {
            const error3 = err instanceof FetchBaseError ? err : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${err.message}`, "system", err);
            this[INTERNALS$2].error = error3;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new fetchBlob([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        body.stream().pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw err;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const err = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_CHAR" });
        throw err;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback) {
        for (const name of this.keys()) {
          callback(this.get(name), name);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status || 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal !== null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-vercel/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-vercel/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/svelte-particles/dist/umd/svelte-particles.js
var require_svelte_particles = __commonJS({
  "node_modules/svelte-particles/dist/umd/svelte-particles.js"(exports, module2) {
    init_shims();
    !function(t, i) {
      typeof exports == "object" && typeof module2 != "undefined" ? module2.exports = i() : typeof define == "function" && define.amd ? define(i) : (t = typeof globalThis != "undefined" ? globalThis : t || self).Particles = i();
    }(exports, function() {
      "use strict";
      function t() {
      }
      function i(t2) {
        return t2();
      }
      function e() {
        return Object.create(null);
      }
      function o(t2) {
        t2.forEach(i);
      }
      function s2(t2) {
        return typeof t2 == "function";
      }
      function n(t2, i2) {
        return t2 != t2 ? i2 == i2 : t2 !== i2 || t2 && typeof t2 == "object" || typeof t2 == "function";
      }
      let a, r = false;
      function l(t2, i2, e2, o2) {
        for (; t2 < i2; ) {
          const s3 = t2 + (i2 - t2 >> 1);
          e2(s3) <= o2 ? t2 = s3 + 1 : i2 = s3;
        }
        return t2;
      }
      function c(t2, i2) {
        r ? (!function(t3) {
          if (t3.hydrate_init)
            return;
          t3.hydrate_init = true;
          const i3 = t3.childNodes, e2 = new Int32Array(i3.length + 1), o2 = new Int32Array(i3.length);
          e2[0] = -1;
          let s3 = 0;
          for (let t4 = 0; t4 < i3.length; t4++) {
            const n3 = l(1, s3 + 1, (t5) => i3[e2[t5]].claim_order, i3[t4].claim_order) - 1;
            o2[t4] = e2[n3] + 1;
            const a3 = n3 + 1;
            e2[a3] = t4, s3 = Math.max(a3, s3);
          }
          const n2 = [], a2 = [];
          let r2 = i3.length - 1;
          for (let t4 = e2[s3] + 1; t4 != 0; t4 = o2[t4 - 1]) {
            for (n2.push(i3[t4 - 1]); r2 >= t4; r2--)
              a2.push(i3[r2]);
            r2--;
          }
          for (; r2 >= 0; r2--)
            a2.push(i3[r2]);
          n2.reverse(), a2.sort((t4, i4) => t4.claim_order - i4.claim_order);
          for (let i4 = 0, e3 = 0; i4 < a2.length; i4++) {
            for (; e3 < n2.length && a2[i4].claim_order >= n2[e3].claim_order; )
              e3++;
            const o3 = e3 < n2.length ? n2[e3] : null;
            t3.insertBefore(a2[i4], o3);
          }
        }(t2), (t2.actual_end_child === void 0 || t2.actual_end_child !== null && t2.actual_end_child.parentElement !== t2) && (t2.actual_end_child = t2.firstChild), i2 !== t2.actual_end_child ? t2.insertBefore(i2, t2.actual_end_child) : t2.actual_end_child = i2.nextSibling) : i2.parentNode !== t2 && t2.appendChild(i2);
      }
      function d(t2) {
        t2.parentNode.removeChild(t2);
      }
      function h(t2, i2, e2) {
        e2 == null ? t2.removeAttribute(i2) : t2.getAttribute(i2) !== e2 && t2.setAttribute(i2, e2);
      }
      function u(t2) {
        a = t2;
      }
      function v() {
        if (!a)
          throw new Error("Function called outside component initialization");
        return a;
      }
      function p() {
        const t2 = v();
        return (i2, e2) => {
          const o2 = t2.$$.callbacks[i2];
          if (o2) {
            const s3 = function(t3, i3) {
              const e3 = document.createEvent("CustomEvent");
              return e3.initCustomEvent(t3, false, false, i3), e3;
            }(i2, e2);
            o2.slice().forEach((i3) => {
              i3.call(t2, s3);
            });
          }
        };
      }
      const f = [], y = [], m = [], g = [], b = Promise.resolve();
      let w = false;
      function x(t2) {
        m.push(t2);
      }
      let k = false;
      const P = new Set();
      function z() {
        if (!k) {
          k = true;
          do {
            for (let t2 = 0; t2 < f.length; t2 += 1) {
              const i2 = f[t2];
              u(i2), M(i2.$$);
            }
            for (u(null), f.length = 0; y.length; )
              y.pop()();
            for (let t2 = 0; t2 < m.length; t2 += 1) {
              const i2 = m[t2];
              P.has(i2) || (P.add(i2), i2());
            }
            m.length = 0;
          } while (f.length);
          for (; g.length; )
            g.pop()();
          w = false, k = false, P.clear();
        }
      }
      function M(t2) {
        if (t2.fragment !== null) {
          t2.update(), o(t2.before_update);
          const i2 = t2.dirty;
          t2.dirty = [-1], t2.fragment && t2.fragment.p(t2.ctx, i2), t2.after_update.forEach(x);
        }
      }
      const C = new Set();
      function O(t2, i2) {
        t2.$$.dirty[0] === -1 && (f.push(t2), w || (w = true, b.then(z)), t2.$$.dirty.fill(0)), t2.$$.dirty[i2 / 31 | 0] |= 1 << i2 % 31;
      }
      function S(n2, l2, c2, h2, v2, p2, f2 = [-1]) {
        const y2 = a;
        u(n2);
        const m2 = n2.$$ = { fragment: null, ctx: null, props: p2, update: t, not_equal: v2, bound: e(), on_mount: [], on_destroy: [], on_disconnect: [], before_update: [], after_update: [], context: new Map(y2 ? y2.$$.context : l2.context || []), callbacks: e(), dirty: f2, skip_bound: false };
        let g2 = false;
        if (m2.ctx = c2 ? c2(n2, l2.props || {}, (t2, i2, ...e2) => {
          const o2 = e2.length ? e2[0] : i2;
          return m2.ctx && v2(m2.ctx[t2], m2.ctx[t2] = o2) && (!m2.skip_bound && m2.bound[t2] && m2.bound[t2](o2), g2 && O(n2, t2)), i2;
        }) : [], m2.update(), g2 = true, o(m2.before_update), m2.fragment = !!h2 && h2(m2.ctx), l2.target) {
          if (l2.hydrate) {
            r = true;
            const t2 = function(t3) {
              return Array.from(t3.childNodes);
            }(l2.target);
            m2.fragment && m2.fragment.l(t2), t2.forEach(d);
          } else
            m2.fragment && m2.fragment.c();
          l2.intro && ((b2 = n2.$$.fragment) && b2.i && (C.delete(b2), b2.i(w2))), function(t2, e2, n3, a2) {
            const { fragment: r2, on_mount: l3, on_destroy: c3, after_update: d2 } = t2.$$;
            r2 && r2.m(e2, n3), a2 || x(() => {
              const e3 = l3.map(i).filter(s2);
              c3 ? c3.push(...e3) : o(e3), t2.$$.on_mount = [];
            }), d2.forEach(x);
          }(n2, l2.target, l2.anchor, l2.customElement), r = false, z();
        }
        var b2, w2;
        u(y2);
      }
      class A {
        getSidesCount() {
          return 4;
        }
        draw(t2, i2, e2) {
          t2.rect(-e2, -e2, 2 * e2, 2 * e2);
        }
      }
      var E, R, T, I, D, _, L, q, F, H, V, $, B, W, N, G, U, j, Y, X, Q;
      !function(t2) {
        t2.bottom = "bottom", t2.bottomLeft = "bottom-left", t2.bottomRight = "bottom-right", t2.left = "left", t2.none = "none", t2.right = "right", t2.top = "top", t2.topLeft = "top-left", t2.topRight = "top-right";
      }(E || (E = {})), function(t2) {
        t2.clockwise = "clockwise", t2.counterClockwise = "counter-clockwise", t2.random = "random";
      }(R || (R = {})), function(t2) {
        t2.bottom = "bottom", t2.left = "left", t2.right = "right", t2.top = "top";
      }(T || (T = {})), function(t2) {
        t2.clockwise = "clockwise", t2.counterClockwise = "counter-clockwise", t2.random = "random";
      }(I || (I = {})), function(t2) {
        t2.attract = "attract", t2.bubble = "bubble", t2.push = "push", t2.remove = "remove", t2.repulse = "repulse", t2.pause = "pause", t2.trail = "trail";
      }(D || (D = {})), function(t2) {
        t2.none = "none", t2.split = "split";
      }(_ || (_ = {})), function(t2) {
        t2.bounce = "bounce", t2.bubble = "bubble", t2.repulse = "repulse";
      }(L || (L = {})), function(t2) {
        t2.attract = "attract", t2.bounce = "bounce", t2.bubble = "bubble", t2.connect = "connect", t2.grab = "grab", t2.light = "light", t2.repulse = "repulse", t2.slow = "slow", t2.trail = "trail";
      }(q || (q = {})), function(t2) {
        t2.absorb = "absorb", t2.bounce = "bounce", t2.destroy = "destroy";
      }(F || (F = {})), function(t2) {
        t2.bounce = "bounce", t2.bounceHorizontal = "bounce-horizontal", t2.bounceVertical = "bounce-vertical", t2.none = "none", t2.out = "out", t2.destroy = "destroy", t2.split = "split";
      }(H || (H = {})), function(t2) {
        t2.precise = "precise", t2.percent = "percent";
      }(V || (V = {})), function(t2) {
        t2.any = "any", t2.dark = "dark", t2.light = "light";
      }($ || ($ = {})), function(t2) {
        t2[t2.increasing = 0] = "increasing", t2[t2.decreasing = 1] = "decreasing";
      }(B || (B = {})), function(t2) {
        t2.none = "none", t2.max = "max", t2.min = "min";
      }(W || (W = {})), function(t2) {
        t2[t2.External = 0] = "External", t2[t2.Particles = 1] = "Particles";
      }(N || (N = {})), function(t2) {
        t2.color = "color", t2.opacity = "opacity", t2.size = "size";
      }(G || (G = {})), function(t2) {
        t2.char = "char", t2.character = "character", t2.circle = "circle", t2.edge = "edge", t2.image = "image", t2.images = "images", t2.line = "line", t2.polygon = "polygon", t2.square = "square", t2.star = "star", t2.triangle = "triangle";
      }(U || (U = {})), function(t2) {
        t2.max = "max", t2.min = "min", t2.random = "random";
      }(j || (j = {})), function(t2) {
        t2.circle = "circle", t2.rectangle = "rectangle";
      }(Y || (Y = {})), function(t2) {
        t2.easeOutBack = "ease-out-back", t2.easeOutCirc = "ease-out-circ", t2.easeOutCubic = "ease-out-cubic", t2.easeOutQuad = "ease-out-quad", t2.easeOutQuart = "ease-out-quart", t2.easeOutQuint = "ease-out-quint", t2.easeOutExpo = "ease-out-expo", t2.easeOutSine = "ease-out-sine";
      }(X || (X = {})), function(t2) {
        t2.canvas = "canvas", t2.parent = "parent", t2.window = "window";
      }(Q || (Q = {}));
      class J {
        constructor(t2, i2) {
          let e2, o2;
          if (i2 === void 0) {
            if (typeof t2 == "number")
              throw new Error("tsParticles - Vector not initialized correctly");
            const i3 = t2;
            [e2, o2] = [i3.x, i3.y];
          } else
            [e2, o2] = [t2, i2];
          this.x = e2, this.y = o2;
        }
        static clone(t2) {
          return J.create(t2.x, t2.y);
        }
        static create(t2, i2) {
          return new J(t2, i2);
        }
        get angle() {
          return Math.atan2(this.y, this.x);
        }
        set angle(t2) {
          this.updateFromAngle(t2, this.length);
        }
        get length() {
          return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        }
        set length(t2) {
          this.updateFromAngle(this.angle, t2);
        }
        add(t2) {
          return J.create(this.x + t2.x, this.y + t2.y);
        }
        addTo(t2) {
          this.x += t2.x, this.y += t2.y;
        }
        sub(t2) {
          return J.create(this.x - t2.x, this.y - t2.y);
        }
        subFrom(t2) {
          this.x -= t2.x, this.y -= t2.y;
        }
        mult(t2) {
          return J.create(this.x * t2, this.y * t2);
        }
        multTo(t2) {
          this.x *= t2, this.y *= t2;
        }
        div(t2) {
          return J.create(this.x / t2, this.y / t2);
        }
        divTo(t2) {
          this.x /= t2, this.y /= t2;
        }
        distanceTo(t2) {
          return this.sub(t2).length;
        }
        getLengthSq() {
          return Math.pow(this.x, 2) + Math.pow(this.y, 2);
        }
        distanceToSq(t2) {
          return this.sub(t2).getLengthSq();
        }
        manhattanDistanceTo(t2) {
          return Math.abs(t2.x - this.x) + Math.abs(t2.y - this.y);
        }
        copy() {
          return J.clone(this);
        }
        setTo(t2) {
          this.x = t2.x, this.y = t2.y;
        }
        rotate(t2) {
          return J.create(this.x * Math.cos(t2) - this.y * Math.sin(t2), this.x * Math.sin(t2) + this.y * Math.cos(t2));
        }
        updateFromAngle(t2, i2) {
          this.x = Math.cos(t2) * i2, this.y = Math.sin(t2) * i2;
        }
      }
      function Z(t2, i2, e2) {
        return Math.min(Math.max(t2, i2), e2);
      }
      function K(t2, i2, e2, o2) {
        return Math.floor((t2 * e2 + i2 * o2) / (e2 + o2));
      }
      function tt(t2) {
        const i2 = ot(t2);
        let e2 = et(t2);
        return i2 === e2 && (e2 = 0), Math.random() * (i2 - e2) + e2;
      }
      function it(t2) {
        return typeof t2 == "number" ? t2 : tt(t2);
      }
      function et(t2) {
        return typeof t2 == "number" ? t2 : t2.min;
      }
      function ot(t2) {
        return typeof t2 == "number" ? t2 : t2.max;
      }
      function st(t2, i2) {
        if (t2 === i2 || i2 === void 0 && typeof t2 == "number")
          return t2;
        const e2 = et(t2), o2 = ot(t2);
        return i2 !== void 0 ? { min: Math.min(e2, i2), max: Math.max(o2, i2) } : st(e2, o2);
      }
      function nt(t2) {
        const i2 = t2.random, { enable: e2, minimumValue: o2 } = typeof i2 == "boolean" ? { enable: i2, minimumValue: 0 } : i2;
        return it(e2 ? st(t2.value, o2) : t2.value);
      }
      function at(t2, i2) {
        const e2 = t2.x - i2.x, o2 = t2.y - i2.y;
        return { dx: e2, dy: o2, distance: Math.sqrt(e2 * e2 + o2 * o2) };
      }
      function rt(t2, i2) {
        return at(t2, i2).distance;
      }
      function lt(t2, i2, e2, o2) {
        return J.create(t2.x * (e2 - o2) / (e2 + o2) + 2 * i2.x * o2 / (e2 + o2), t2.y);
      }
      function ct(t2, i2) {
        switch (i2) {
          case X.easeOutQuad:
            return 1 - Math.pow(1 - t2, 2);
          case X.easeOutCubic:
            return 1 - Math.pow(1 - t2, 3);
          case X.easeOutQuart:
            return 1 - Math.pow(1 - t2, 4);
          case X.easeOutQuint:
            return 1 - Math.pow(1 - t2, 5);
          case X.easeOutExpo:
            return t2 === 1 ? 1 : 1 - Math.pow(2, -10 * t2);
          case X.easeOutSine:
            return Math.sin(t2 * Math.PI / 2);
          case X.easeOutBack: {
            const i3 = 1.70158;
            return 1 + (i3 + 1) * Math.pow(t2 - 1, 3) + i3 * Math.pow(t2 - 1, 2);
          }
          case X.easeOutCirc:
            return Math.sqrt(1 - Math.pow(t2 - 1, 2));
          default:
            return t2;
        }
      }
      J.origin = J.create(0, 0);
      var dt = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      };
      function ht(t2, i2, e2, o2, s3, n2) {
        const a2 = { bounced: false };
        return i2.min >= o2.min && i2.min <= o2.max && i2.max >= o2.min && i2.max <= o2.max && (t2.max >= e2.min && t2.max <= (e2.max + e2.min) / 2 && s3 > 0 || t2.min <= e2.max && t2.min > (e2.max + e2.min) / 2 && s3 < 0) && (a2.velocity = s3 * -n2, a2.bounced = true), a2;
      }
      function ut(t2, i2) {
        if (i2 instanceof Array) {
          for (const e2 of i2)
            if (t2.matches(e2))
              return true;
          return false;
        }
        return t2.matches(i2);
      }
      function vt() {
        return typeof window == "undefined" || !window;
      }
      function pt(t2, i2) {
        return t2 === i2 || i2 instanceof Array && i2.indexOf(t2) > -1;
      }
      function ft(t2) {
        var i2, e2;
        return dt(this, void 0, void 0, function* () {
          try {
            yield document.fonts.load(`${(i2 = t2.weight) !== null && i2 !== void 0 ? i2 : "400"} 36px '${(e2 = t2.font) !== null && e2 !== void 0 ? e2 : "Verdana"}'`);
          } catch (t3) {
          }
        });
      }
      function yt(t2, i2, e2 = true) {
        return t2[i2 !== void 0 && e2 ? i2 % t2.length : function(t3) {
          return Math.floor(Math.random() * t3.length);
        }(t2)];
      }
      function mt(t2, i2, e2, o2) {
        return function(t3, i3, e3) {
          let o3 = true;
          e3 && e3 !== T.bottom || (o3 = t3.top < i3.height);
          !o3 || e3 && e3 !== T.left || (o3 = t3.right > 0);
          !o3 || e3 && e3 !== T.right || (o3 = t3.left < i3.width);
          !o3 || e3 && e3 !== T.top || (o3 = t3.bottom > 0);
          return o3;
        }(gt(t2, e2 != null ? e2 : 0), i2, o2);
      }
      function gt(t2, i2) {
        return { bottom: t2.y + i2, left: t2.x - i2, right: t2.x + i2, top: t2.y - i2 };
      }
      function bt(t2) {
        return new Promise((i2, e2) => {
          if (!t2)
            return void e2("Error tsParticles - No image.src");
          const o2 = { source: t2, type: t2.substr(t2.length - 3) }, s3 = new Image();
          s3.addEventListener("load", () => {
            o2.element = s3, i2(o2);
          }), s3.addEventListener("error", () => {
            e2(`Error tsParticles - loading image: ${t2}`);
          }), s3.src = t2;
        });
      }
      function wt(t2, ...i2) {
        for (const e2 of i2) {
          if (e2 == null)
            continue;
          if (typeof e2 != "object") {
            t2 = e2;
            continue;
          }
          const i3 = Array.isArray(e2);
          !i3 || typeof t2 == "object" && t2 && Array.isArray(t2) ? i3 || typeof t2 == "object" && t2 && !Array.isArray(t2) || (t2 = {}) : t2 = [];
          for (const i4 in e2) {
            if (i4 === "__proto__")
              continue;
            const o2 = e2[i4], s3 = typeof o2 == "object", n2 = t2;
            n2[i4] = s3 && Array.isArray(o2) ? o2.map((t3) => wt(n2[i4], t3)) : wt(n2[i4], o2);
          }
        }
        return t2;
      }
      function xt(t2, i2) {
        return i2 instanceof Array ? !!i2.find((i3) => i3.enable && pt(t2, i3.mode)) : pt(t2, i2.mode);
      }
      function kt(t2, i2, e2) {
        if (i2 instanceof Array)
          for (const o2 of i2) {
            const i3 = o2.mode;
            o2.enable && pt(t2, i3) && Pt(o2, e2);
          }
        else {
          const o2 = i2.mode;
          i2.enable && pt(t2, o2) && Pt(i2, e2);
        }
      }
      function Pt(t2, i2) {
        const e2 = t2.selectors;
        if (e2 instanceof Array)
          for (const o2 of e2)
            i2(o2, t2);
        else
          i2(e2, t2);
      }
      function zt(t2, i2) {
        if (i2 && t2)
          return t2 instanceof Array ? t2.find((t3) => ut(i2, t3.selectors)) : ut(i2, t2.selectors) ? t2 : void 0;
      }
      function Mt(t2) {
        return { position: t2.getPosition(), radius: t2.getRadius(), mass: t2.getMass(), velocity: t2.velocity, factor: { horizontal: nt(t2.options.bounce.horizontal), vertical: nt(t2.options.bounce.vertical) } };
      }
      function Ct(t2, i2) {
        const e2 = t2.velocity.x, o2 = t2.velocity.y, s3 = t2.position, n2 = i2.position;
        if (e2 * (n2.x - s3.x) + o2 * (n2.y - s3.y) >= 0) {
          const e3 = -Math.atan2(n2.y - s3.y, n2.x - s3.x), o3 = t2.mass, a2 = i2.mass, r2 = t2.velocity.rotate(e3), l2 = i2.velocity.rotate(e3), c2 = lt(r2, l2, o3, a2), d2 = lt(l2, r2, o3, a2), h2 = c2.rotate(-e3), u2 = d2.rotate(-e3);
          t2.velocity.x = h2.x * t2.factor.horizontal, t2.velocity.y = h2.y * t2.factor.vertical, i2.velocity.x = u2.x * i2.factor.horizontal, i2.velocity.y = u2.y * i2.factor.vertical;
        }
      }
      function Ot(t2, i2) {
        const e2 = gt(t2.getPosition(), t2.getRadius()), o2 = ht({ min: e2.left, max: e2.right }, { min: e2.top, max: e2.bottom }, { min: i2.left, max: i2.right }, { min: i2.top, max: i2.bottom }, t2.velocity.x, nt(t2.options.bounce.horizontal));
        o2.bounced && (o2.velocity !== void 0 && (t2.velocity.x = o2.velocity), o2.position !== void 0 && (t2.position.x = o2.position));
        const s3 = ht({ min: e2.top, max: e2.bottom }, { min: e2.left, max: e2.right }, { min: i2.top, max: i2.bottom }, { min: i2.left, max: i2.right }, t2.velocity.y, nt(t2.options.bounce.vertical));
        s3.bounced && (s3.velocity !== void 0 && (t2.velocity.y = s3.velocity), s3.position !== void 0 && (t2.position.y = s3.position));
      }
      class St {
      }
      function At(t2, i2, e2) {
        let o2 = e2;
        return o2 < 0 && (o2 += 1), o2 > 1 && (o2 -= 1), o2 < 1 / 6 ? t2 + 6 * (i2 - t2) * o2 : o2 < 0.5 ? i2 : o2 < 2 / 3 ? t2 + (i2 - t2) * (2 / 3 - o2) * 6 : t2;
      }
      function Et(t2) {
        if (t2.startsWith("rgb")) {
          const i2 = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([\d.]+)\s*)?\)/i.exec(t2);
          return i2 ? { a: i2.length > 4 ? parseFloat(i2[5]) : 1, b: parseInt(i2[3], 10), g: parseInt(i2[2], 10), r: parseInt(i2[1], 10) } : void 0;
        }
        if (t2.startsWith("hsl")) {
          const i2 = /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+)\s*)?\)/i.exec(t2);
          return i2 ? function(t3) {
            const i3 = It(t3);
            return { a: t3.a, b: i3.b, g: i3.g, r: i3.r };
          }({ a: i2.length > 4 ? parseFloat(i2[5]) : 1, h: parseInt(i2[1], 10), l: parseInt(i2[3], 10), s: parseInt(i2[2], 10) }) : void 0;
        }
        if (t2.startsWith("hsv")) {
          const i2 = /hsva?\(\s*(\d+)°\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+)\s*)?\)/i.exec(t2);
          return i2 ? function(t3) {
            const i3 = Dt(t3);
            return { a: t3.a, b: i3.b, g: i3.g, r: i3.r };
          }({ a: i2.length > 4 ? parseFloat(i2[5]) : 1, h: parseInt(i2[1], 10), s: parseInt(i2[2], 10), v: parseInt(i2[3], 10) }) : void 0;
        }
        {
          const i2 = /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i, e2 = t2.replace(i2, (t3, i3, e3, o3, s3) => i3 + i3 + e3 + e3 + o3 + o3 + (s3 !== void 0 ? s3 + s3 : "")), o2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(e2);
          return o2 ? { a: o2[4] !== void 0 ? parseInt(o2[4], 16) / 255 : 1, b: parseInt(o2[3], 16), g: parseInt(o2[2], 16), r: parseInt(o2[1], 16) } : void 0;
        }
      }
      function Rt(t2, i2, e2 = true) {
        var o2, s3, n2;
        if (t2 === void 0)
          return;
        const a2 = typeof t2 == "string" ? { value: t2 } : t2;
        let r2;
        if (typeof a2.value == "string")
          r2 = a2.value === St.randomColorValue ? _t() : function(t3) {
            return Et(t3);
          }(a2.value);
        else if (a2.value instanceof Array) {
          r2 = Rt({ value: yt(a2.value, i2, e2) });
        } else {
          const t3 = a2.value, i3 = (o2 = t3.rgb) !== null && o2 !== void 0 ? o2 : a2.value;
          if (i3.r !== void 0)
            r2 = i3;
          else {
            const i4 = (s3 = t3.hsl) !== null && s3 !== void 0 ? s3 : a2.value;
            if (i4.h !== void 0 && i4.l !== void 0)
              r2 = It(i4);
            else {
              const i5 = (n2 = t3.hsv) !== null && n2 !== void 0 ? n2 : a2.value;
              i5.h !== void 0 && i5.v !== void 0 && (r2 = Dt(i5));
            }
          }
        }
        return r2;
      }
      function Tt(t2, i2, e2 = true) {
        const o2 = Rt(t2, i2, e2);
        return o2 !== void 0 ? function(t3) {
          const i3 = t3.r / 255, e3 = t3.g / 255, o3 = t3.b / 255, s3 = Math.max(i3, e3, o3), n2 = Math.min(i3, e3, o3), a2 = { h: 0, l: (s3 + n2) / 2, s: 0 };
          s3 != n2 && (a2.s = a2.l < 0.5 ? (s3 - n2) / (s3 + n2) : (s3 - n2) / (2 - s3 - n2), a2.h = i3 === s3 ? (e3 - o3) / (s3 - n2) : a2.h = e3 === s3 ? 2 + (o3 - i3) / (s3 - n2) : 4 + (i3 - e3) / (s3 - n2));
          a2.l *= 100, a2.s *= 100, a2.h *= 60, a2.h < 0 && (a2.h += 360);
          return a2;
        }(o2) : void 0;
      }
      function It(t2) {
        const i2 = { b: 0, g: 0, r: 0 }, e2 = { h: t2.h / 360, l: t2.l / 100, s: t2.s / 100 };
        if (e2.s === 0)
          i2.b = e2.l, i2.g = e2.l, i2.r = e2.l;
        else {
          const t3 = e2.l < 0.5 ? e2.l * (1 + e2.s) : e2.l + e2.s - e2.l * e2.s, o2 = 2 * e2.l - t3;
          i2.r = At(o2, t3, e2.h + 1 / 3), i2.g = At(o2, t3, e2.h), i2.b = At(o2, t3, e2.h - 1 / 3);
        }
        return i2.r = Math.floor(255 * i2.r), i2.g = Math.floor(255 * i2.g), i2.b = Math.floor(255 * i2.b), i2;
      }
      function Dt(t2) {
        const i2 = { b: 0, g: 0, r: 0 }, e2 = t2.h / 60, o2 = t2.s / 100, s3 = t2.v / 100, n2 = s3 * o2, a2 = n2 * (1 - Math.abs(e2 % 2 - 1));
        let r2;
        if (e2 >= 0 && e2 <= 1 ? r2 = { r: n2, g: a2, b: 0 } : e2 > 1 && e2 <= 2 ? r2 = { r: a2, g: n2, b: 0 } : e2 > 2 && e2 <= 3 ? r2 = { r: 0, g: n2, b: a2 } : e2 > 3 && e2 <= 4 ? r2 = { r: 0, g: a2, b: n2 } : e2 > 4 && e2 <= 5 ? r2 = { r: a2, g: 0, b: n2 } : e2 > 5 && e2 <= 6 && (r2 = { r: n2, g: 0, b: a2 }), r2) {
          const t3 = s3 - n2;
          i2.r = Math.floor(255 * (r2.r + t3)), i2.g = Math.floor(255 * (r2.g + t3)), i2.b = Math.floor(255 * (r2.b + t3));
        }
        return i2;
      }
      function _t(t2) {
        const i2 = t2 != null ? t2 : 0;
        return { b: Math.floor(tt(st(i2, 256))), g: Math.floor(tt(st(i2, 256))), r: Math.floor(tt(st(i2, 256))) };
      }
      function Lt(t2, i2) {
        return `rgba(${t2.r}, ${t2.g}, ${t2.b}, ${i2 != null ? i2 : 1})`;
      }
      function qt(t2, i2) {
        return `hsla(${t2.h}, ${t2.s}%, ${t2.l}%, ${i2 != null ? i2 : 1})`;
      }
      function Ft(t2, i2, e2, o2) {
        let s3 = t2, n2 = i2;
        return s3.r === void 0 && (s3 = It(t2)), n2.r === void 0 && (n2 = It(i2)), { b: K(s3.b, n2.b, e2, o2), g: K(s3.g, n2.g, e2, o2), r: K(s3.r, n2.r, e2, o2) };
      }
      function Ht(t2, i2, e2) {
        var o2, s3;
        if (e2 === St.randomColorValue)
          return _t();
        if (e2 !== "mid")
          return e2;
        {
          const e3 = (o2 = t2.getFillColor()) !== null && o2 !== void 0 ? o2 : t2.getStrokeColor(), n2 = (s3 = i2 == null ? void 0 : i2.getFillColor()) !== null && s3 !== void 0 ? s3 : i2 == null ? void 0 : i2.getStrokeColor();
          if (e3 && n2 && i2)
            return Ft(e3, n2, t2.getRadius(), i2.getRadius());
          {
            const t3 = e3 != null ? e3 : n2;
            if (t3)
              return It(t3);
          }
        }
      }
      function Vt(t2, i2, e2) {
        const o2 = typeof t2 == "string" ? t2 : t2.value;
        return o2 === St.randomColorValue ? e2 ? Rt({ value: o2 }) : i2 ? St.randomColorValue : St.midColorValue : Rt({ value: o2 });
      }
      function $t(t2) {
        return t2 !== void 0 ? { h: t2.h.value, s: t2.s.value, l: t2.l.value } : void 0;
      }
      function Bt(t2, i2, e2) {
        t2.beginPath(), t2.moveTo(i2.x, i2.y), t2.lineTo(e2.x, e2.y), t2.closePath();
      }
      function Wt(t2, i2) {
        t2.clearRect(0, 0, i2.width, i2.height);
      }
      St.canvasClass = "tsparticles-canvas-el", St.randomColorValue = "random", St.midColorValue = "mid", St.touchEndEvent = "touchend", St.mouseDownEvent = "mousedown", St.mouseUpEvent = "mouseup", St.mouseMoveEvent = "mousemove", St.touchStartEvent = "touchstart", St.touchMoveEvent = "touchmove", St.mouseLeaveEvent = "mouseleave", St.mouseOutEvent = "mouseout", St.touchCancelEvent = "touchcancel", St.resizeEvent = "resize", St.visibilityChangeEvent = "visibilitychange", St.noPolygonDataLoaded = "No polygon data loaded.", St.noPolygonFound = "No polygon found, you need to specify SVG url in config.";
      class Nt {
        constructor(t2, i2) {
          this.position = { x: t2, y: i2 };
        }
      }
      class Gt extends Nt {
        constructor(t2, i2, e2) {
          super(t2, i2), this.radius = e2;
        }
        contains(t2) {
          return Math.pow(t2.x - this.position.x, 2) + Math.pow(t2.y - this.position.y, 2) <= this.radius * this.radius;
        }
        intersects(t2) {
          const i2 = t2, e2 = t2, o2 = this.position, s3 = t2.position, n2 = Math.abs(s3.x - o2.x), a2 = Math.abs(s3.y - o2.y), r2 = this.radius;
          if (e2.radius !== void 0) {
            return r2 + e2.radius > Math.sqrt(n2 * n2 + a2 + a2);
          }
          if (i2.size !== void 0) {
            const t3 = i2.size.width, e3 = i2.size.height, o3 = Math.pow(n2 - t3, 2) + Math.pow(a2 - e3, 2);
            return !(n2 > r2 + t3 || a2 > r2 + e3) && (n2 <= t3 || a2 <= e3 || o3 <= r2 * r2);
          }
          return false;
        }
      }
      class Ut extends Nt {
        constructor(t2, i2, e2, o2) {
          super(t2, i2), this.size = { height: o2, width: e2 };
        }
        contains(t2) {
          const i2 = this.size.width, e2 = this.size.height, o2 = this.position;
          return t2.x >= o2.x && t2.x <= o2.x + i2 && t2.y >= o2.y && t2.y <= o2.y + e2;
        }
        intersects(t2) {
          const i2 = t2, e2 = t2, o2 = this.size.width, s3 = this.size.height, n2 = this.position, a2 = t2.position;
          if (e2.radius !== void 0)
            return e2.intersects(this);
          if (i2.size !== void 0) {
            const t3 = i2.size, e3 = t3.width, r2 = t3.height;
            return a2.x < n2.x + o2 && a2.x + e3 > n2.x && a2.y < n2.y + s3 && a2.y + r2 > n2.y;
          }
          return false;
        }
      }
      class jt extends Gt {
        constructor(t2, i2, e2, o2) {
          super(t2, i2, e2), this.canvasSize = o2, this.canvasSize = { height: o2.height, width: o2.width };
        }
        contains(t2) {
          if (super.contains(t2))
            return true;
          const i2 = { x: t2.x - this.canvasSize.width, y: t2.y };
          if (super.contains(i2))
            return true;
          const e2 = { x: t2.x - this.canvasSize.width, y: t2.y - this.canvasSize.height };
          if (super.contains(e2))
            return true;
          const o2 = { x: t2.x, y: t2.y - this.canvasSize.height };
          return super.contains(o2);
        }
        intersects(t2) {
          if (super.intersects(t2))
            return true;
          const i2 = t2, e2 = t2, o2 = { x: t2.position.x - this.canvasSize.width, y: t2.position.y - this.canvasSize.height };
          if (e2.radius !== void 0) {
            const t3 = new Gt(o2.x, o2.y, 2 * e2.radius);
            return super.intersects(t3);
          }
          if (i2.size !== void 0) {
            const t3 = new Ut(o2.x, o2.y, 2 * i2.size.width, 2 * i2.size.height);
            return super.intersects(t3);
          }
          return false;
        }
      }
      function Yt(t2, i2, e2, o2, s3) {
        if (o2) {
          let o3 = { passive: true };
          typeof s3 == "boolean" ? o3.capture = s3 : s3 !== void 0 && (o3 = s3), t2.addEventListener(i2, e2, o3);
        } else {
          const o3 = s3;
          t2.removeEventListener(i2, e2, o3);
        }
      }
      class Xt {
        constructor(t2) {
          this.container = t2, this.canPush = true, this.mouseMoveHandler = (t3) => this.mouseTouchMove(t3), this.touchStartHandler = (t3) => this.mouseTouchMove(t3), this.touchMoveHandler = (t3) => this.mouseTouchMove(t3), this.touchEndHandler = () => this.mouseTouchFinish(), this.mouseLeaveHandler = () => this.mouseTouchFinish(), this.touchCancelHandler = () => this.mouseTouchFinish(), this.touchEndClickHandler = (t3) => this.mouseTouchClick(t3), this.mouseUpHandler = (t3) => this.mouseTouchClick(t3), this.mouseDownHandler = () => this.mouseDown(), this.visibilityChangeHandler = () => this.handleVisibilityChange(), this.resizeHandler = () => this.handleWindowResize();
        }
        addListeners() {
          this.manageListeners(true);
        }
        removeListeners() {
          this.manageListeners(false);
        }
        manageListeners(t2) {
          var i2;
          const e2 = this.container, o2 = e2.actualOptions, s3 = o2.interactivity.detectsOn;
          let n2 = St.mouseLeaveEvent;
          if (s3 === Q.window)
            e2.interactivity.element = window, n2 = St.mouseOutEvent;
          else if (s3 === Q.parent && e2.canvas.element) {
            const t3 = e2.canvas.element;
            e2.interactivity.element = (i2 = t3.parentElement) !== null && i2 !== void 0 ? i2 : t3.parentNode;
          } else
            e2.interactivity.element = e2.canvas.element;
          const a2 = e2.interactivity.element;
          if (!a2)
            return;
          const r2 = a2;
          (o2.interactivity.events.onHover.enable || o2.interactivity.events.onClick.enable) && (Yt(a2, St.mouseMoveEvent, this.mouseMoveHandler, t2), Yt(a2, St.touchStartEvent, this.touchStartHandler, t2), Yt(a2, St.touchMoveEvent, this.touchMoveHandler, t2), o2.interactivity.events.onClick.enable ? (Yt(a2, St.touchEndEvent, this.touchEndClickHandler, t2), Yt(a2, St.mouseUpEvent, this.mouseUpHandler, t2), Yt(a2, St.mouseDownEvent, this.mouseDownHandler, t2)) : Yt(a2, St.touchEndEvent, this.touchEndHandler, t2), Yt(a2, n2, this.mouseLeaveHandler, t2), Yt(a2, St.touchCancelEvent, this.touchCancelHandler, t2)), e2.canvas.element && (e2.canvas.element.style.pointerEvents = r2 === e2.canvas.element ? "initial" : "none"), o2.interactivity.events.resize && Yt(window, St.resizeEvent, this.resizeHandler, t2), document && Yt(document, St.visibilityChangeEvent, this.visibilityChangeHandler, t2, false);
        }
        handleWindowResize() {
          this.resizeTimeout && (clearTimeout(this.resizeTimeout), delete this.resizeTimeout), this.resizeTimeout = setTimeout(() => {
            var t2;
            return (t2 = this.container.canvas) === null || t2 === void 0 ? void 0 : t2.windowResize();
          }, 500);
        }
        handleVisibilityChange() {
          const t2 = this.container, i2 = t2.actualOptions;
          this.mouseTouchFinish(), i2.pauseOnBlur && ((document === null || document === void 0 ? void 0 : document.hidden) ? (t2.pageHidden = true, t2.pause()) : (t2.pageHidden = false, t2.getAnimationStatus() ? t2.play(true) : t2.draw()));
        }
        mouseDown() {
          const t2 = this.container.interactivity;
          if (t2) {
            const i2 = t2.mouse;
            i2.clicking = true, i2.downPosition = i2.position;
          }
        }
        mouseTouchMove(t2) {
          var i2, e2, o2, s3, n2, a2, r2;
          const l2 = this.container, c2 = l2.actualOptions;
          if (((i2 = l2.interactivity) === null || i2 === void 0 ? void 0 : i2.element) === void 0)
            return;
          let d2;
          l2.interactivity.mouse.inside = true;
          const h2 = l2.canvas.element;
          if (t2.type.startsWith("mouse")) {
            this.canPush = true;
            const i3 = t2;
            if (l2.interactivity.element === window) {
              if (h2) {
                const t3 = h2.getBoundingClientRect();
                d2 = { x: i3.clientX - t3.left, y: i3.clientY - t3.top };
              }
            } else if (c2.interactivity.detectsOn === Q.parent) {
              const t3 = i3.target, s4 = i3.currentTarget, n3 = l2.canvas.element;
              if (t3 && s4 && n3) {
                const e3 = t3.getBoundingClientRect(), o3 = s4.getBoundingClientRect(), a3 = n3.getBoundingClientRect();
                d2 = { x: i3.offsetX + 2 * e3.left - (o3.left + a3.left), y: i3.offsetY + 2 * e3.top - (o3.top + a3.top) };
              } else
                d2 = { x: (e2 = i3.offsetX) !== null && e2 !== void 0 ? e2 : i3.clientX, y: (o2 = i3.offsetY) !== null && o2 !== void 0 ? o2 : i3.clientY };
            } else
              i3.target === l2.canvas.element && (d2 = { x: (s3 = i3.offsetX) !== null && s3 !== void 0 ? s3 : i3.clientX, y: (n2 = i3.offsetY) !== null && n2 !== void 0 ? n2 : i3.clientY });
          } else {
            this.canPush = t2.type !== "touchmove";
            const i3 = t2, e3 = i3.touches[i3.touches.length - 1], o3 = h2 == null ? void 0 : h2.getBoundingClientRect();
            d2 = { x: e3.clientX - ((a2 = o3 == null ? void 0 : o3.left) !== null && a2 !== void 0 ? a2 : 0), y: e3.clientY - ((r2 = o3 == null ? void 0 : o3.top) !== null && r2 !== void 0 ? r2 : 0) };
          }
          const u2 = l2.retina.pixelRatio;
          d2 && (d2.x *= u2, d2.y *= u2), l2.interactivity.mouse.position = d2, l2.interactivity.status = St.mouseMoveEvent;
        }
        mouseTouchFinish() {
          const t2 = this.container.interactivity;
          if (t2 === void 0)
            return;
          const i2 = t2.mouse;
          delete i2.position, delete i2.clickPosition, delete i2.downPosition, t2.status = St.mouseLeaveEvent, i2.inside = false, i2.clicking = false;
        }
        mouseTouchClick(t2) {
          const i2 = this.container, e2 = i2.actualOptions, o2 = i2.interactivity.mouse;
          o2.inside = true;
          let s3 = false;
          const n2 = o2.position;
          if (n2 !== void 0 && e2.interactivity.events.onClick.enable) {
            for (const [, t3] of i2.plugins)
              if (t3.clickPositionValid !== void 0 && (s3 = t3.clickPositionValid(n2), s3))
                break;
            s3 || this.doMouseTouchClick(t2), o2.clicking = false;
          }
        }
        doMouseTouchClick(t2) {
          const i2 = this.container, e2 = i2.actualOptions;
          if (this.canPush) {
            const t3 = i2.interactivity.mouse.position;
            if (!t3)
              return;
            i2.interactivity.mouse.clickPosition = { x: t3.x, y: t3.y }, i2.interactivity.mouse.clickTime = new Date().getTime();
            const o2 = e2.interactivity.events.onClick;
            if (o2.mode instanceof Array)
              for (const t4 of o2.mode)
                this.handleClickMode(t4);
            else
              this.handleClickMode(o2.mode);
          }
          t2.type === "touchend" && setTimeout(() => this.mouseTouchFinish(), 500);
        }
        handleClickMode(t2) {
          const i2 = this.container, e2 = i2.actualOptions, o2 = e2.interactivity.modes.push.quantity, s3 = e2.interactivity.modes.remove.quantity;
          switch (t2) {
            case D.push:
              if (o2 > 0) {
                const t3 = yt([void 0, ...e2.interactivity.modes.push.groups]), s4 = t3 !== void 0 ? i2.actualOptions.particles.groups[t3] : void 0;
                i2.particles.push(o2, i2.interactivity.mouse, s4, t3);
              }
              break;
            case D.remove:
              i2.particles.removeQuantity(s3);
              break;
            case D.bubble:
              i2.bubble.clicking = true;
              break;
            case D.repulse:
              i2.repulse.clicking = true, i2.repulse.count = 0;
              for (const t3 of i2.repulse.particles)
                t3.velocity.setTo(t3.initialVelocity);
              i2.repulse.particles = [], i2.repulse.finish = false, setTimeout(() => {
                i2.destroyed || (i2.repulse.clicking = false);
              }, 1e3 * e2.interactivity.modes.repulse.duration);
              break;
            case D.attract:
              i2.attract.clicking = true, i2.attract.count = 0;
              for (const t3 of i2.attract.particles)
                t3.velocity.setTo(t3.initialVelocity);
              i2.attract.particles = [], i2.attract.finish = false, setTimeout(() => {
                i2.destroyed || (i2.attract.clicking = false);
              }, 1e3 * e2.interactivity.modes.attract.duration);
              break;
            case D.pause:
              i2.getAnimationStatus() ? i2.pause() : i2.play();
          }
          for (const [, e3] of i2.plugins)
            e3.handleClickMode && e3.handleClickMode(t2);
        }
      }
      const Qt = [], Jt = new Map(), Zt = new Map(), Kt = new Map(), ti = new Map(), ii = new Map(), ei = new Map(), oi = new Map();
      class si {
        static getPlugin(t2) {
          return Qt.find((i2) => i2.id === t2);
        }
        static addPlugin(t2) {
          si.getPlugin(t2.id) || Qt.push(t2);
        }
        static getAvailablePlugins(t2) {
          const i2 = new Map();
          for (const e2 of Qt)
            e2.needsPlugin(t2.actualOptions) && i2.set(e2.id, e2.getPlugin(t2));
          return i2;
        }
        static loadOptions(t2, i2) {
          for (const e2 of Qt)
            e2.loadOptions(t2, i2);
        }
        static getPreset(t2) {
          return ii.get(t2);
        }
        static addPreset(t2, i2, e2 = false) {
          !e2 && si.getPreset(t2) || ii.set(t2, i2);
        }
        static addShapeDrawer(t2, i2) {
          si.getShapeDrawer(t2) || ei.set(t2, i2);
        }
        static getShapeDrawer(t2) {
          return ei.get(t2);
        }
        static getSupportedShapes() {
          return ei.keys();
        }
        static getPathGenerator(t2) {
          return oi.get(t2);
        }
        static addPathGenerator(t2, i2) {
          si.getPathGenerator(t2) || oi.set(t2, i2);
        }
        static getInteractors(t2) {
          let i2 = Kt.get(t2);
          return i2 || (i2 = [...Jt.values()].map((i3) => i3(t2)), Kt.set(t2, i2)), i2;
        }
        static addInteractor(t2, i2) {
          Jt.set(t2, i2);
        }
        static getUpdaters(t2) {
          let i2 = ti.get(t2);
          return i2 || (i2 = [...Zt.values()].map((i3) => i3(t2)), ti.set(t2, i2)), i2;
        }
        static addParticleUpdater(t2, i2) {
          Zt.set(t2, i2);
        }
      }
      class ni {
        constructor(t2, i2) {
          this.position = t2, this.particle = i2;
        }
      }
      class ai {
        constructor(t2, i2) {
          this.rectangle = t2, this.capacity = i2, this.points = [], this.divided = false;
        }
        subdivide() {
          const t2 = this.rectangle.position.x, i2 = this.rectangle.position.y, e2 = this.rectangle.size.width, o2 = this.rectangle.size.height, s3 = this.capacity;
          this.northEast = new ai(new Ut(t2, i2, e2 / 2, o2 / 2), s3), this.northWest = new ai(new Ut(t2 + e2 / 2, i2, e2 / 2, o2 / 2), s3), this.southEast = new ai(new Ut(t2, i2 + o2 / 2, e2 / 2, o2 / 2), s3), this.southWest = new ai(new Ut(t2 + e2 / 2, i2 + o2 / 2, e2 / 2, o2 / 2), s3), this.divided = true;
        }
        insert(t2) {
          var i2, e2, o2, s3, n2;
          return !!this.rectangle.contains(t2.position) && (this.points.length < this.capacity ? (this.points.push(t2), true) : (this.divided || this.subdivide(), (n2 = ((i2 = this.northEast) === null || i2 === void 0 ? void 0 : i2.insert(t2)) || ((e2 = this.northWest) === null || e2 === void 0 ? void 0 : e2.insert(t2)) || ((o2 = this.southEast) === null || o2 === void 0 ? void 0 : o2.insert(t2)) || ((s3 = this.southWest) === null || s3 === void 0 ? void 0 : s3.insert(t2))) !== null && n2 !== void 0 && n2));
        }
        queryCircle(t2, i2) {
          return this.query(new Gt(t2.x, t2.y, i2));
        }
        queryCircleWarp(t2, i2, e2) {
          const o2 = e2, s3 = e2;
          return this.query(new jt(t2.x, t2.y, i2, o2.canvas !== void 0 ? o2.canvas.size : s3));
        }
        queryRectangle(t2, i2) {
          return this.query(new Ut(t2.x, t2.y, i2.width, i2.height));
        }
        query(t2, i2) {
          var e2, o2, s3, n2;
          const a2 = i2 != null ? i2 : [];
          if (!t2.intersects(this.rectangle))
            return [];
          for (const i3 of this.points)
            t2.contains(i3.position) && a2.push(i3.particle);
          return this.divided && ((e2 = this.northEast) === null || e2 === void 0 || e2.query(t2, a2), (o2 = this.northWest) === null || o2 === void 0 || o2.query(t2, a2), (s3 = this.southEast) === null || s3 === void 0 || s3.query(t2, a2), (n2 = this.southWest) === null || n2 === void 0 || n2.query(t2, a2)), a2;
        }
      }
      var ri = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      };
      class li {
        getSidesCount() {
          return 12;
        }
        init(t2) {
          var i2;
          return ri(this, void 0, void 0, function* () {
            const e2 = t2.actualOptions;
            if (pt(U.char, e2.particles.shape.type) || pt(U.character, e2.particles.shape.type)) {
              const t3 = (i2 = e2.particles.shape.options[U.character]) !== null && i2 !== void 0 ? i2 : e2.particles.shape.options[U.char];
              if (t3 instanceof Array)
                for (const i3 of t3)
                  yield ft(i3);
              else
                t3 !== void 0 && (yield ft(t3));
            }
          });
        }
        draw(t2, i2, e2, o2) {
          var s3, n2, a2;
          const r2 = i2.shapeData;
          if (r2 === void 0)
            return;
          const l2 = r2.value;
          if (l2 === void 0)
            return;
          const c2 = i2;
          c2.text === void 0 && (c2.text = l2 instanceof Array ? yt(l2, i2.randomIndexData) : l2);
          const d2 = c2.text, h2 = (s3 = r2.style) !== null && s3 !== void 0 ? s3 : "", u2 = (n2 = r2.weight) !== null && n2 !== void 0 ? n2 : "400", v2 = 2 * Math.round(e2), p2 = (a2 = r2.font) !== null && a2 !== void 0 ? a2 : "Verdana", f2 = i2.fill, y2 = d2.length * e2 / 2;
          t2.font = `${h2} ${u2} ${v2}px "${p2}"`;
          const m2 = { x: -y2, y: e2 / 2 };
          t2.globalAlpha = o2, f2 ? t2.fillText(d2, m2.x, m2.y) : t2.strokeText(d2, m2.x, m2.y), t2.globalAlpha = 1;
        }
      }
      var ci = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      };
      class di {
        constructor() {
          this.images = [];
        }
        getSidesCount() {
          return 12;
        }
        getImages(t2) {
          const i2 = this.images.filter((i3) => i3.id === t2.id);
          return i2.length ? i2[0] : (this.images.push({ id: t2.id, images: [] }), this.getImages(t2));
        }
        addImage(t2, i2) {
          const e2 = this.getImages(t2);
          e2 == null || e2.images.push(i2);
        }
        init(t2) {
          return ci(this, void 0, void 0, function* () {
            yield this.loadImagesFromParticlesOptions(t2, t2.actualOptions.particles), yield this.loadImagesFromParticlesOptions(t2, t2.actualOptions.interactivity.modes.trail.particles);
            for (const i3 of t2.actualOptions.manualParticles)
              yield this.loadImagesFromParticlesOptions(t2, i3.options);
            const i2 = t2.actualOptions;
            if (i2.emitters)
              if (i2.emitters instanceof Array)
                for (const e3 of i2.emitters)
                  yield this.loadImagesFromParticlesOptions(t2, e3.particles);
              else
                yield this.loadImagesFromParticlesOptions(t2, i2.emitters.particles);
            const e2 = i2.interactivity.modes.emitters;
            if (e2)
              if (e2 instanceof Array)
                for (const i3 of e2)
                  yield this.loadImagesFromParticlesOptions(t2, i3.particles);
              else
                yield this.loadImagesFromParticlesOptions(t2, e2.particles);
          });
        }
        destroy() {
          this.images = [];
        }
        loadImagesFromParticlesOptions(t2, i2) {
          var e2, o2, s3;
          return ci(this, void 0, void 0, function* () {
            const n2 = i2 == null ? void 0 : i2.shape;
            if (!(n2 == null ? void 0 : n2.type) || !n2.options || !pt(U.image, n2.type) && !pt(U.images, n2.type))
              return;
            const a2 = this.images.findIndex((i3) => i3.id === t2.id);
            a2 >= 0 && this.images.splice(a2, 1);
            const r2 = (e2 = n2.options[U.images]) !== null && e2 !== void 0 ? e2 : n2.options[U.image];
            if (r2 instanceof Array)
              for (const i3 of r2)
                yield this.loadImageShape(t2, i3);
            else
              yield this.loadImageShape(t2, r2);
            if (i2 == null ? void 0 : i2.groups)
              for (const e3 in i2.groups) {
                const o3 = i2.groups[e3];
                yield this.loadImagesFromParticlesOptions(t2, o3);
              }
            ((s3 = (o2 = i2 == null ? void 0 : i2.destroy) === null || o2 === void 0 ? void 0 : o2.split) === null || s3 === void 0 ? void 0 : s3.particles) && (yield this.loadImagesFromParticlesOptions(t2, i2 == null ? void 0 : i2.destroy.split.particles));
          });
        }
        loadImageShape(t2, i2) {
          return ci(this, void 0, void 0, function* () {
            try {
              const e2 = i2.replaceColor ? yield function(t3) {
                return dt(this, void 0, void 0, function* () {
                  if (!t3)
                    throw new Error("Error tsParticles - No image.src");
                  const i3 = { source: t3, type: t3.substr(t3.length - 3) };
                  if (i3.type !== "svg")
                    return bt(t3);
                  const e3 = yield fetch(i3.source);
                  if (!e3.ok)
                    throw new Error("Error tsParticles - Image not found");
                  return i3.svgData = yield e3.text(), i3;
                });
              }(i2.src) : yield bt(i2.src);
              e2 && this.addImage(t2, e2);
            } catch (t3) {
              console.warn(`tsParticles error - ${i2.src} not found`);
            }
          });
        }
        draw(t2, i2, e2, o2) {
          var s3, n2;
          if (!t2)
            return;
          const a2 = i2.image, r2 = (s3 = a2 == null ? void 0 : a2.data) === null || s3 === void 0 ? void 0 : s3.element;
          if (!r2)
            return;
          const l2 = (n2 = a2 == null ? void 0 : a2.ratio) !== null && n2 !== void 0 ? n2 : 1, c2 = { x: -e2, y: -e2 };
          (a2 == null ? void 0 : a2.data.svgData) && (a2 == null ? void 0 : a2.replaceColor) || (t2.globalAlpha = o2), t2.drawImage(r2, c2.x, c2.y, 2 * e2, 2 * e2 / l2), (a2 == null ? void 0 : a2.data.svgData) && (a2 == null ? void 0 : a2.replaceColor) || (t2.globalAlpha = 1);
        }
      }
      class hi {
        getSidesCount() {
          return 1;
        }
        draw(t2, i2, e2) {
          t2.moveTo(-e2 / 2, 0), t2.lineTo(e2 / 2, 0);
        }
      }
      class ui {
        getSidesCount() {
          return 12;
        }
        draw(t2, i2, e2) {
          t2.arc(0, 0, e2, 0, 2 * Math.PI, false);
        }
      }
      class vi {
        getSidesCount(t2) {
          var i2, e2;
          const o2 = t2.shapeData;
          return (e2 = (i2 = o2 == null ? void 0 : o2.sides) !== null && i2 !== void 0 ? i2 : o2 == null ? void 0 : o2.nb_sides) !== null && e2 !== void 0 ? e2 : 5;
        }
        draw(t2, i2, e2) {
          const o2 = this.getCenter(i2, e2), s3 = this.getSidesData(i2, e2), n2 = s3.count.numerator * s3.count.denominator, a2 = s3.count.numerator / s3.count.denominator, r2 = 180 * (a2 - 2) / a2, l2 = Math.PI - Math.PI * r2 / 180;
          if (t2) {
            t2.beginPath(), t2.translate(o2.x, o2.y), t2.moveTo(0, 0);
            for (let i3 = 0; i3 < n2; i3++)
              t2.lineTo(s3.length, 0), t2.translate(s3.length, 0), t2.rotate(l2);
          }
        }
      }
      class pi extends vi {
        getSidesCount() {
          return 3;
        }
        getSidesData(t2, i2) {
          return { count: { denominator: 2, numerator: 3 }, length: 2 * i2 };
        }
        getCenter(t2, i2) {
          return { x: -i2, y: i2 / 1.66 };
        }
      }
      class fi {
        getSidesCount(t2) {
          var i2, e2;
          const o2 = t2.shapeData;
          return (e2 = (i2 = o2 == null ? void 0 : o2.sides) !== null && i2 !== void 0 ? i2 : o2 == null ? void 0 : o2.nb_sides) !== null && e2 !== void 0 ? e2 : 5;
        }
        draw(t2, i2, e2) {
          var o2;
          const s3 = i2.shapeData, n2 = this.getSidesCount(i2), a2 = (o2 = s3 == null ? void 0 : s3.inset) !== null && o2 !== void 0 ? o2 : 2;
          t2.moveTo(0, 0 - e2);
          for (let i3 = 0; i3 < n2; i3++)
            t2.rotate(Math.PI / n2), t2.lineTo(0, 0 - e2 * a2), t2.rotate(Math.PI / n2), t2.lineTo(0, 0 - e2);
        }
      }
      class yi extends vi {
        getSidesData(t2, i2) {
          var e2, o2;
          const s3 = t2.shapeData, n2 = (o2 = (e2 = s3 == null ? void 0 : s3.sides) !== null && e2 !== void 0 ? e2 : s3 == null ? void 0 : s3.nb_sides) !== null && o2 !== void 0 ? o2 : 5;
          return { count: { denominator: 1, numerator: n2 }, length: 2.66 * i2 / (n2 / 3) };
        }
        getCenter(t2, i2) {
          return { x: -i2 / (this.getSidesCount(t2) / 3.5), y: -i2 / 0.76 };
        }
      }
      class mi {
        constructor(t2) {
          this.container = t2, this.size = { height: 0, width: 0 }, this.context = null, this.generatedCanvas = false;
        }
        init() {
          this.resize(), this.initStyle(), this.initCover(), this.initTrail(), this.initBackground(), this.paint();
        }
        loadCanvas(t2, i2) {
          var e2;
          t2.className || (t2.className = St.canvasClass), this.generatedCanvas && ((e2 = this.element) === null || e2 === void 0 || e2.remove()), this.generatedCanvas = i2 != null ? i2 : this.generatedCanvas, this.element = t2, this.originalStyle = wt({}, this.element.style), this.size.height = t2.offsetHeight, this.size.width = t2.offsetWidth, this.context = this.element.getContext("2d"), this.container.retina.init(), this.initBackground();
        }
        destroy() {
          var t2;
          this.generatedCanvas && ((t2 = this.element) === null || t2 === void 0 || t2.remove()), this.safePaint((t3) => {
            Wt(t3, this.size);
          });
        }
        paint() {
          const t2 = this.container.actualOptions;
          this.safePaint((i2) => {
            t2.backgroundMask.enable && t2.backgroundMask.cover && this.coverColor ? (Wt(i2, this.size), this.paintBase(Lt(this.coverColor, this.coverColor.a))) : this.paintBase();
          });
        }
        clear() {
          const t2 = this.container.actualOptions, i2 = t2.particles.move.trail;
          t2.backgroundMask.enable ? this.paint() : i2.enable && i2.length > 0 && this.trailFillColor ? this.paintBase(Lt(this.trailFillColor, 1 / i2.length)) : this.safePaint((t3) => {
            Wt(t3, this.size);
          });
        }
        windowResize() {
          if (!this.element)
            return;
          const t2 = this.container;
          this.resize(), t2.actualOptions.setResponsive(this.size.width, t2.retina.pixelRatio, t2.options), t2.particles.setDensity();
          for (const [, i2] of t2.plugins)
            i2.resize !== void 0 && i2.resize();
        }
        resize() {
          if (!this.element)
            return;
          const t2 = this.container, i2 = t2.retina.pixelRatio, e2 = t2.canvas.size, o2 = e2.width, s3 = e2.height;
          e2.width = this.element.offsetWidth * i2, e2.height = this.element.offsetHeight * i2, this.element.width = e2.width, this.element.height = e2.height, this.container.started && (this.resizeFactor = { width: e2.width / o2, height: e2.height / s3 });
        }
        drawConnectLine(t2, i2) {
          this.safePaint((e2) => {
            var o2;
            const s3 = this.lineStyle(t2, i2);
            if (!s3)
              return;
            const n2 = t2.getPosition(), a2 = i2.getPosition();
            !function(t3, i3, e3, o3, s4) {
              t3.save(), Bt(t3, o3, s4), t3.lineWidth = i3, t3.strokeStyle = e3, t3.stroke(), t3.restore();
            }(e2, (o2 = t2.linksWidth) !== null && o2 !== void 0 ? o2 : this.container.retina.linksWidth, s3, n2, a2);
          });
        }
        drawGrabLine(t2, i2, e2, o2) {
          const s3 = this.container;
          this.safePaint((n2) => {
            var a2;
            const r2 = t2.getPosition();
            !function(t3, i3, e3, o3, s4, n3) {
              t3.save(), Bt(t3, e3, o3), t3.strokeStyle = Lt(s4, n3), t3.lineWidth = i3, t3.stroke(), t3.restore();
            }(n2, (a2 = t2.linksWidth) !== null && a2 !== void 0 ? a2 : s3.retina.linksWidth, r2, o2, i2, e2);
          });
        }
        drawParticleShadow(t2, i2) {
          this.safePaint((e2) => {
            !function(t3, i3, e3, o2) {
              const s3 = e3.getPosition(), n2 = t3.actualOptions.interactivity.modes.light.shadow;
              i3.save();
              const a2 = e3.getRadius(), r2 = e3.sides, l2 = 2 * Math.PI / r2, c2 = -e3.rotate.value + Math.PI / 4, d2 = [];
              for (let t4 = 0; t4 < r2; t4++)
                d2.push({ x: s3.x + a2 * Math.sin(c2 + l2 * t4) * 1, y: s3.y + a2 * Math.cos(c2 + l2 * t4) * 1 });
              const h2 = [], u2 = n2.length;
              for (const t4 of d2) {
                const i4 = Math.atan2(o2.y - t4.y, o2.x - t4.x), e4 = t4.x + u2 * Math.sin(-i4 - Math.PI / 2), s4 = t4.y + u2 * Math.cos(-i4 - Math.PI / 2);
                h2.push({ endX: e4, endY: s4, startX: t4.x, startY: t4.y });
              }
              const v2 = Rt(n2.color);
              if (!v2)
                return;
              const p2 = Lt(v2);
              for (let t4 = h2.length - 1; t4 >= 0; t4--) {
                const e4 = t4 == h2.length - 1 ? 0 : t4 + 1;
                i3.beginPath(), i3.moveTo(h2[t4].startX, h2[t4].startY), i3.lineTo(h2[e4].startX, h2[e4].startY), i3.lineTo(h2[e4].endX, h2[e4].endY), i3.lineTo(h2[t4].endX, h2[t4].endY), i3.fillStyle = p2, i3.fill();
              }
              i3.restore();
            }(this.container, e2, t2, i2);
          });
        }
        drawLinkTriangle(t2, i2, e2) {
          var o2;
          const s3 = this.container, n2 = s3.actualOptions, a2 = i2.destination, r2 = e2.destination, l2 = t2.options.links.triangles, c2 = (o2 = l2.opacity) !== null && o2 !== void 0 ? o2 : (i2.opacity + e2.opacity) / 2;
          c2 <= 0 || this.safePaint((i3) => {
            const e3 = t2.getPosition(), o3 = a2.getPosition(), d2 = r2.getPosition();
            if (rt(e3, o3) > s3.retina.linksDistance || rt(d2, o3) > s3.retina.linksDistance || rt(d2, e3) > s3.retina.linksDistance)
              return;
            let h2 = Rt(l2.color);
            if (!h2) {
              const i4 = t2.options.links, e4 = i4.id !== void 0 ? s3.particles.linksColors.get(i4.id) : s3.particles.linksColor;
              if (h2 = Ht(t2, a2, e4), !h2)
                return;
            }
            !function(t3, i4, e4, o4, s4, n3, a3, r3) {
              !function(t4, i5, e5, o5) {
                t4.beginPath(), t4.moveTo(i5.x, i5.y), t4.lineTo(e5.x, e5.y), t4.lineTo(o5.x, o5.y), t4.closePath();
              }(t3, i4, e4, o4), s4 && (t3.globalCompositeOperation = n3), t3.fillStyle = Lt(a3, r3), t3.fill();
            }(i3, e3, o3, d2, n2.backgroundMask.enable, n2.backgroundMask.composite, h2, c2);
          });
        }
        drawLinkLine(t2, i2) {
          const e2 = this.container, o2 = e2.actualOptions, s3 = i2.destination;
          let n2 = i2.opacity;
          const a2 = t2.getPosition(), r2 = s3.getPosition();
          this.safePaint((i3) => {
            var l2, c2;
            let d2;
            const h2 = t2.options.twinkle.lines;
            if (h2.enable) {
              const t3 = h2.frequency, i4 = Rt(h2.color);
              Math.random() < t3 && i4 !== void 0 && (d2 = i4, n2 = h2.opacity);
            }
            if (!d2) {
              const i4 = t2.options.links, o3 = i4.id !== void 0 ? e2.particles.linksColors.get(i4.id) : e2.particles.linksColor;
              d2 = Ht(t2, s3, o3);
            }
            if (!d2)
              return;
            const u2 = (l2 = t2.linksWidth) !== null && l2 !== void 0 ? l2 : e2.retina.linksWidth, v2 = (c2 = t2.linksDistance) !== null && c2 !== void 0 ? c2 : e2.retina.linksDistance;
            !function(t3, i4, e3, o3, s4, n3, a3, r3, l3, c3, d3, h3) {
              let u3 = false;
              if (rt(e3, o3) <= s4)
                Bt(t3, e3, o3), u3 = true;
              else if (a3) {
                let i5, a4;
                const r4 = at(e3, { x: o3.x - n3.width, y: o3.y });
                if (r4.distance <= s4) {
                  const t4 = e3.y - r4.dy / r4.dx * e3.x;
                  i5 = { x: 0, y: t4 }, a4 = { x: n3.width, y: t4 };
                } else {
                  const t4 = at(e3, { x: o3.x, y: o3.y - n3.height });
                  if (t4.distance <= s4) {
                    const o4 = -(e3.y - t4.dy / t4.dx * e3.x) / (t4.dy / t4.dx);
                    i5 = { x: o4, y: 0 }, a4 = { x: o4, y: n3.height };
                  } else {
                    const t5 = at(e3, { x: o3.x - n3.width, y: o3.y - n3.height });
                    if (t5.distance <= s4) {
                      const o4 = e3.y - t5.dy / t5.dx * e3.x;
                      i5 = { x: -o4 / (t5.dy / t5.dx), y: o4 }, a4 = { x: i5.x + n3.width, y: i5.y + n3.height };
                    }
                  }
                }
                i5 && a4 && (Bt(t3, e3, i5), Bt(t3, o3, a4), u3 = true);
              }
              if (u3) {
                if (t3.lineWidth = i4, r3 && (t3.globalCompositeOperation = l3), t3.strokeStyle = Lt(c3, d3), h3.enable) {
                  const i5 = Rt(h3.color);
                  i5 && (t3.shadowBlur = h3.blur, t3.shadowColor = Lt(i5));
                }
                t3.stroke();
              }
            }(i3, u2, a2, r2, v2, e2.canvas.size, t2.options.links.warp, o2.backgroundMask.enable, o2.backgroundMask.composite, d2, n2, t2.options.links.shadow);
          });
        }
        drawParticle(t2, i2) {
          var e2, o2, s3, n2;
          if (((e2 = t2.image) === null || e2 === void 0 ? void 0 : e2.loaded) === false || t2.spawning || t2.destroyed)
            return;
          const a2 = t2.getFillColor(), r2 = (o2 = t2.getStrokeColor()) !== null && o2 !== void 0 ? o2 : a2;
          if (!a2 && !r2)
            return;
          let [l2, c2] = this.getPluginParticleColors(t2);
          const d2 = t2.options.twinkle.particles, h2 = d2.enable && Math.random() < d2.frequency;
          if (!l2 || !c2) {
            const t3 = Tt(d2.color);
            l2 || (l2 = h2 && t3 !== void 0 ? t3 : a2 || void 0), c2 || (c2 = h2 && t3 !== void 0 ? t3 : r2 || void 0);
          }
          const u2 = this.container.actualOptions, v2 = t2.options.zIndex, p2 = 1 - v2.opacityRate * t2.zIndexFactor, f2 = t2.getRadius(), y2 = h2 ? d2.opacity : (s3 = t2.bubble.opacity) !== null && s3 !== void 0 ? s3 : t2.opacity.value, m2 = (n2 = t2.stroke.opacity) !== null && n2 !== void 0 ? n2 : y2, g2 = y2 * p2, b2 = l2 ? qt(l2, g2) : void 0;
          (b2 || c2) && this.safePaint((e3) => {
            const o3 = 1 - v2.sizeRate * t2.zIndexFactor, s4 = c2 ? qt(c2, m2 * p2) : b2;
            this.drawParticleLinks(t2), f2 > 0 && function(t3, i3, e4, o4, s5, n3, a3, r3, l3, c3, d3) {
              const h3 = e4.getPosition(), u3 = e4.options.tilt, v3 = e4.options.roll;
              i3.save(), u3.enable || v3.enable ? i3.setTransform(v3.enable ? Math.cos(e4.rollAngle) : 1, u3.enable ? Math.cos(e4.tilt.value) * e4.tilt.cosDirection : 0, u3.enable ? Math.sin(e4.tilt.value) * e4.tilt.sinDirection : 0, v3.enable ? Math.sin(e4.rollAngle) : 1, h3.x, h3.y) : i3.translate(h3.x, h3.y), i3.beginPath();
              const p3 = e4.rotate.value + (e4.options.rotate.path ? e4.velocity.angle : 0);
              p3 !== 0 && i3.rotate(p3), a3 && (i3.globalCompositeOperation = r3);
              const f3 = e4.shadowColor;
              d3.enable && f3 && (i3.shadowBlur = d3.blur, i3.shadowColor = Lt(f3), i3.shadowOffsetX = d3.offset.x, i3.shadowOffsetY = d3.offset.y), s5 && (i3.fillStyle = s5);
              const y3 = e4.stroke;
              i3.lineWidth = e4.strokeWidth, n3 && (i3.strokeStyle = n3), function(t4, i4, e5, o5, s6, n4) {
                if (!e5.shape)
                  return;
                const a4 = t4.drawers.get(e5.shape);
                a4 && a4.draw(i4, e5, o5, s6, n4, t4.retina.pixelRatio);
              }(t3, i3, e4, l3, c3, o4), y3.width > 0 && i3.stroke(), e4.close && i3.closePath(), e4.fill && i3.fill(), i3.restore(), i3.save(), u3.enable ? i3.setTransform(1, Math.cos(e4.tilt.value) * e4.tilt.cosDirection, Math.sin(e4.tilt.value) * e4.tilt.sinDirection, 1, h3.x, h3.y) : i3.translate(h3.x, h3.y), p3 !== 0 && i3.rotate(p3), a3 && (i3.globalCompositeOperation = r3), function(t4, i4, e5, o5, s6, n4) {
                if (!e5.shape)
                  return;
                const a4 = t4.drawers.get(e5.shape);
                (a4 == null ? void 0 : a4.afterEffect) && a4.afterEffect(i4, e5, o5, s6, n4, t4.retina.pixelRatio);
              }(t3, i3, e4, l3, c3, o4), i3.restore();
            }(this.container, e3, t2, i2, b2, s4, u2.backgroundMask.enable, u2.backgroundMask.composite, f2 * o3, g2, t2.options.shadow);
          });
        }
        drawParticleLinks(t2) {
          this.safePaint((i2) => {
            const e2 = this.container, o2 = e2.particles, s3 = t2.options;
            if (t2.links.length > 0) {
              i2.save();
              const n2 = t2.links.filter((i3) => e2.particles.getLinkFrequency(t2, i3.destination) <= s3.links.frequency);
              for (const i3 of n2) {
                const a2 = i3.destination;
                if (s3.links.triangles.enable) {
                  const r2 = n2.map((t3) => t3.destination), l2 = a2.links.filter((t3) => e2.particles.getLinkFrequency(a2, t3.destination) <= a2.options.links.frequency && r2.indexOf(t3.destination) >= 0);
                  if (l2.length)
                    for (const e3 of l2) {
                      const n3 = e3.destination;
                      o2.getTriangleFrequency(t2, a2, n3) > s3.links.triangles.frequency || this.drawLinkTriangle(t2, i3, e3);
                    }
                }
                i3.opacity > 0 && e2.retina.linksWidth > 0 && this.drawLinkLine(t2, i3);
              }
              i2.restore();
            }
          });
        }
        drawPlugin(t2, i2) {
          this.safePaint((e2) => {
            !function(t3, i3, e3) {
              i3.draw && (t3.save(), i3.draw(t3, e3), t3.restore());
            }(e2, t2, i2);
          });
        }
        drawLight(t2) {
          this.safePaint((i2) => {
            !function(t3, i3, e2) {
              const o2 = t3.actualOptions.interactivity.modes.light.area;
              i3.beginPath(), i3.arc(e2.x, e2.y, o2.radius, 0, 2 * Math.PI);
              const s3 = i3.createRadialGradient(e2.x, e2.y, 0, e2.x, e2.y, o2.radius), n2 = o2.gradient, a2 = { start: Rt(n2.start), stop: Rt(n2.stop) };
              a2.start && a2.stop && (s3.addColorStop(0, Lt(a2.start)), s3.addColorStop(1, Lt(a2.stop)), i3.fillStyle = s3, i3.fill());
            }(this.container, i2, t2);
          });
        }
        initBackground() {
          const t2 = this.container.actualOptions.background, i2 = this.element, e2 = i2 == null ? void 0 : i2.style;
          if (e2) {
            if (t2.color) {
              const i3 = Rt(t2.color);
              e2.backgroundColor = i3 ? Lt(i3, t2.opacity) : "";
            } else
              e2.backgroundColor = "";
            e2.backgroundImage = t2.image || "", e2.backgroundPosition = t2.position || "", e2.backgroundRepeat = t2.repeat || "", e2.backgroundSize = t2.size || "";
          }
        }
        initCover() {
          const t2 = this.container.actualOptions.backgroundMask.cover, i2 = Rt(t2.color);
          i2 && (this.coverColor = { r: i2.r, g: i2.g, b: i2.b, a: t2.opacity });
        }
        initTrail() {
          const t2 = this.container.actualOptions, i2 = Rt(t2.particles.move.trail.fillColor);
          if (i2) {
            const e2 = t2.particles.move.trail;
            this.trailFillColor = { r: i2.r, g: i2.g, b: i2.b, a: 1 / e2.length };
          }
        }
        getPluginParticleColors(t2) {
          let i2, e2;
          for (const [, o2] of this.container.plugins)
            if (!i2 && o2.particleFillColor && (i2 = Tt(o2.particleFillColor(t2))), !e2 && o2.particleStrokeColor && (e2 = Tt(o2.particleStrokeColor(t2))), i2 && e2)
              break;
          return [i2, e2];
        }
        initStyle() {
          const t2 = this.element, i2 = this.container.actualOptions;
          if (!t2)
            return;
          const e2 = this.originalStyle;
          i2.fullScreen.enable ? (this.originalStyle = wt({}, t2.style), t2.style.position = "fixed", t2.style.zIndex = i2.fullScreen.zIndex.toString(10), t2.style.top = "0", t2.style.left = "0", t2.style.width = "100%", t2.style.height = "100%") : e2 && (t2.style.position = e2.position, t2.style.zIndex = e2.zIndex, t2.style.top = e2.top, t2.style.left = e2.left, t2.style.width = e2.width, t2.style.height = e2.height);
        }
        paintBase(t2) {
          this.safePaint((i2) => {
            !function(t3, i3, e2) {
              t3.save(), t3.fillStyle = e2 != null ? e2 : "rgba(0,0,0,0)", t3.fillRect(0, 0, i3.width, i3.height), t3.restore();
            }(i2, this.size, t2);
          });
        }
        lineStyle(t2, i2) {
          return this.safePaint((e2) => {
            const o2 = this.container.actualOptions.interactivity.modes.connect;
            return function(t3, i3, e3, o3) {
              const s3 = Math.floor(e3.getRadius() / i3.getRadius()), n2 = i3.getFillColor(), a2 = e3.getFillColor();
              if (!n2 || !a2)
                return;
              const r2 = i3.getPosition(), l2 = e3.getPosition(), c2 = Ft(n2, a2, i3.getRadius(), e3.getRadius()), d2 = t3.createLinearGradient(r2.x, r2.y, l2.x, l2.y);
              return d2.addColorStop(0, qt(n2, o3)), d2.addColorStop(s3 > 1 ? 1 : s3, Lt(c2, o3)), d2.addColorStop(1, qt(a2, o3)), d2;
            }(e2, t2, i2, o2.links.opacity);
          });
        }
        safePaint(t2) {
          if (this.context)
            return t2(this.context);
        }
      }
      function gi(t2, i2, e2, o2, s3) {
        switch (i2) {
          case W.max:
            e2 >= s3 && t2.destroy();
            break;
          case W.min:
            e2 <= o2 && t2.destroy();
        }
      }
      class bi {
        constructor(t2, i2) {
          this.container = t2, this.particle = i2;
        }
        update(t2) {
          this.particle.destroyed || (this.updateLife(t2), this.particle.destroyed || this.particle.spawning || (this.updateOpacity(t2), this.updateSize(t2), this.updateAngle(t2), this.updateTilt(t2), this.updateRoll(t2), this.updateWobble(t2), this.updateColor(t2), this.updateStrokeColor(t2), this.updateOutModes(t2)));
        }
        updateLife(t2) {
          const i2 = this.particle;
          let e2 = false;
          if (i2.spawning && (i2.life.delayTime += t2.value, i2.life.delayTime >= i2.life.delay && (e2 = true, i2.spawning = false, i2.life.delayTime = 0, i2.life.time = 0)), i2.life.duration === -1)
            return;
          if (i2.spawning)
            return;
          if (e2 ? i2.life.time = 0 : i2.life.time += t2.value, i2.life.time < i2.life.duration)
            return;
          if (i2.life.time = 0, i2.life.count > 0 && i2.life.count--, i2.life.count === 0)
            return void i2.destroy();
          const o2 = this.container.canvas.size;
          i2.position.x = tt(st(0, o2.width)), i2.position.y = tt(st(0, o2.height)), i2.spawning = true, i2.life.delayTime = 0, i2.life.time = 0, i2.reset();
          const s3 = i2.options.life;
          i2.life.delay = 1e3 * nt(s3.delay), i2.life.duration = 1e3 * nt(s3.duration);
        }
        updateOpacity(t2) {
          var i2, e2;
          const o2 = this.particle, s3 = o2.options.opacity.animation, n2 = o2.opacity.min, a2 = o2.opacity.max;
          if (!o2.destroyed && s3.enable && (s3.count <= 0 || o2.loops.opacity < s3.count)) {
            switch (o2.opacity.status) {
              case B.increasing:
                o2.opacity.value >= a2 ? (o2.opacity.status = B.decreasing, o2.loops.opacity++) : o2.opacity.value += ((i2 = o2.opacity.velocity) !== null && i2 !== void 0 ? i2 : 0) * t2.factor;
                break;
              case B.decreasing:
                o2.opacity.value <= n2 ? (o2.opacity.status = B.increasing, o2.loops.opacity++) : o2.opacity.value -= ((e2 = o2.opacity.velocity) !== null && e2 !== void 0 ? e2 : 0) * t2.factor;
            }
            gi(o2, s3.destroy, o2.opacity.value, n2, a2), o2.destroyed || (o2.opacity.value = Z(o2.opacity.value, n2, a2));
          }
        }
        updateSize(t2) {
          var i2;
          const e2 = this.particle, o2 = e2.options.size.animation, s3 = ((i2 = e2.size.velocity) !== null && i2 !== void 0 ? i2 : 0) * t2.factor, n2 = e2.size.min, a2 = e2.size.max;
          if (!e2.destroyed && o2.enable && (o2.count <= 0 || e2.loops.size < o2.count)) {
            switch (e2.size.status) {
              case B.increasing:
                e2.size.value >= a2 ? (e2.size.status = B.decreasing, e2.loops.size++) : e2.size.value += s3;
                break;
              case B.decreasing:
                e2.size.value <= n2 ? (e2.size.status = B.increasing, e2.loops.size++) : e2.size.value -= s3;
            }
            gi(e2, o2.destroy, e2.size.value, n2, a2), e2.destroyed || (e2.size.value = Z(e2.size.value, n2, a2));
          }
        }
        updateAngle(t2) {
          var i2;
          const e2 = this.particle, o2 = e2.options.rotate.animation, s3 = ((i2 = e2.rotate.velocity) !== null && i2 !== void 0 ? i2 : 0) * t2.factor, n2 = 2 * Math.PI;
          if (o2.enable)
            switch (e2.rotate.status) {
              case B.increasing:
                e2.rotate.value += s3, e2.rotate.value > n2 && (e2.rotate.value -= n2);
                break;
              case B.decreasing:
              default:
                e2.rotate.value -= s3, e2.rotate.value < 0 && (e2.rotate.value += n2);
            }
        }
        updateTilt(t2) {
          var i2;
          const e2 = this.particle, o2 = e2.options.tilt.animation, s3 = ((i2 = e2.tilt.velocity) !== null && i2 !== void 0 ? i2 : 0) * t2.factor, n2 = 2 * Math.PI;
          if (o2.enable)
            switch (e2.tilt.status) {
              case B.increasing:
                e2.tilt.value += s3, e2.tilt.value > n2 && (e2.tilt.value -= n2);
                break;
              case B.decreasing:
              default:
                e2.tilt.value -= s3, e2.tilt.value < 0 && (e2.tilt.value += n2);
            }
        }
        updateRoll(t2) {
          const i2 = this.particle, e2 = i2.options.roll, o2 = i2.rollSpeed * t2.factor, s3 = 2 * Math.PI;
          e2.enable && (i2.rollAngle += o2, i2.rollAngle > s3 && (i2.rollAngle -= s3));
        }
        updateWobble(t2) {
          const i2 = this.particle, e2 = i2.options.wobble, o2 = i2.wobbleSpeed * t2.factor, s3 = i2.wobbleDistance * t2.factor / (1e3 / 60), n2 = 2 * Math.PI;
          e2.enable && (i2.wobbleAngle += o2, i2.wobbleAngle > n2 && (i2.wobbleAngle -= n2), i2.position.x += s3 * Math.cos(i2.wobbleAngle), i2.position.y += s3 * Math.abs(Math.sin(i2.wobbleAngle)));
        }
        updateColor(t2) {
          var i2, e2, o2;
          const s3 = this.particle, n2 = s3.options.color.animation;
          ((i2 = s3.color) === null || i2 === void 0 ? void 0 : i2.h) !== void 0 && this.updateColorValue(s3, t2, s3.color.h, n2.h, 360, false), ((e2 = s3.color) === null || e2 === void 0 ? void 0 : e2.s) !== void 0 && this.updateColorValue(s3, t2, s3.color.s, n2.s, 100, true), ((o2 = s3.color) === null || o2 === void 0 ? void 0 : o2.l) !== void 0 && this.updateColorValue(s3, t2, s3.color.l, n2.l, 100, true);
        }
        updateStrokeColor(t2) {
          var i2, e2, o2, s3, n2, a2, r2, l2, c2, d2, h2, u2;
          const v2 = this.particle;
          if (!v2.stroke.color)
            return;
          const p2 = v2.stroke.color.animation, f2 = p2;
          if (f2.enable !== void 0) {
            const s4 = (e2 = (i2 = v2.strokeColor) === null || i2 === void 0 ? void 0 : i2.h) !== null && e2 !== void 0 ? e2 : (o2 = v2.color) === null || o2 === void 0 ? void 0 : o2.h;
            s4 && this.updateColorValue(v2, t2, s4, f2, 360, false);
          } else {
            const i3 = p2, e3 = (n2 = (s3 = v2.strokeColor) === null || s3 === void 0 ? void 0 : s3.h) !== null && n2 !== void 0 ? n2 : (a2 = v2.color) === null || a2 === void 0 ? void 0 : a2.h;
            e3 && this.updateColorValue(v2, t2, e3, i3.h, 360, false);
            const o3 = (l2 = (r2 = v2.strokeColor) === null || r2 === void 0 ? void 0 : r2.s) !== null && l2 !== void 0 ? l2 : (c2 = v2.color) === null || c2 === void 0 ? void 0 : c2.s;
            o3 && this.updateColorValue(v2, t2, o3, i3.s, 100, true);
            const f3 = (h2 = (d2 = v2.strokeColor) === null || d2 === void 0 ? void 0 : d2.l) !== null && h2 !== void 0 ? h2 : (u2 = v2.color) === null || u2 === void 0 ? void 0 : u2.l;
            f3 && this.updateColorValue(v2, t2, f3, i3.l, 100, true);
          }
        }
        updateColorValue(t2, i2, e2, o2, s3, n2) {
          var a2;
          const r2 = e2;
          if (!r2 || !o2.enable)
            return;
          const l2 = tt(o2.offset), c2 = ((a2 = e2.velocity) !== null && a2 !== void 0 ? a2 : 0) * i2.factor + 3.6 * l2;
          n2 && r2.status !== B.increasing ? (r2.value -= c2, r2.value < 0 && (r2.status = B.increasing, r2.value += r2.value)) : (r2.value += c2, n2 && r2.value > s3 && (r2.status = B.decreasing, r2.value -= r2.value % s3)), r2.value > s3 && (r2.value %= s3);
        }
        updateOutModes(t2) {
          var i2, e2, o2, s3;
          const n2 = this.particle.options.move.outModes;
          this.updateOutMode(t2, (i2 = n2.bottom) !== null && i2 !== void 0 ? i2 : n2.default, T.bottom), this.updateOutMode(t2, (e2 = n2.left) !== null && e2 !== void 0 ? e2 : n2.default, T.left), this.updateOutMode(t2, (o2 = n2.right) !== null && o2 !== void 0 ? o2 : n2.default, T.right), this.updateOutMode(t2, (s3 = n2.top) !== null && s3 !== void 0 ? s3 : n2.default, T.top);
        }
        updateOutMode(t2, i2, e2) {
          const o2 = this.container, s3 = this.particle;
          switch (i2) {
            case H.bounce:
            case H.bounceVertical:
            case H.bounceHorizontal:
            case "bounceVertical":
            case "bounceHorizontal":
            case H.split:
              this.updateBounce(t2, e2, i2);
              break;
            case H.destroy:
              mt(s3.position, o2.canvas.size, s3.getRadius(), e2) || o2.particles.remove(s3, void 0, true);
              break;
            case H.out:
              mt(s3.position, o2.canvas.size, s3.getRadius(), e2) || this.fixOutOfCanvasPosition(e2);
              break;
            case H.none:
              this.bounceNone(e2);
          }
        }
        fixOutOfCanvasPosition(t2) {
          const i2 = this.container, e2 = this.particle, o2 = e2.options.move.warp, s3 = i2.canvas.size, n2 = { bottom: s3.height + e2.getRadius() - e2.offset.y, left: -e2.getRadius() - e2.offset.x, right: s3.width + e2.getRadius() + e2.offset.x, top: -e2.getRadius() - e2.offset.y }, a2 = e2.getRadius(), r2 = gt(e2.position, a2);
          t2 === T.right && r2.left > s3.width - e2.offset.x ? (e2.position.x = n2.left, o2 || (e2.position.y = Math.random() * s3.height)) : t2 === T.left && r2.right < -e2.offset.x && (e2.position.x = n2.right, o2 || (e2.position.y = Math.random() * s3.height)), t2 === T.bottom && r2.top > s3.height - e2.offset.y ? (o2 || (e2.position.x = Math.random() * s3.width), e2.position.y = n2.top) : t2 === T.top && r2.bottom < -e2.offset.y && (o2 || (e2.position.x = Math.random() * s3.width), e2.position.y = n2.bottom);
        }
        updateBounce(t2, i2, e2) {
          const o2 = this.container, s3 = this.particle;
          let n2 = false;
          for (const [, e3] of o2.plugins)
            if (e3.particleBounce !== void 0 && (n2 = e3.particleBounce(s3, t2, i2)), n2)
              break;
          if (n2)
            return;
          const a2 = s3.getPosition(), r2 = s3.offset, l2 = s3.getRadius(), c2 = gt(a2, l2), d2 = o2.canvas.size;
          !function(t3) {
            if (t3.outMode !== H.bounce && t3.outMode !== H.bounceHorizontal && t3.outMode !== "bounceHorizontal" && t3.outMode !== H.split)
              return;
            const i3 = t3.particle.velocity.x;
            if (!(t3.direction === T.right && t3.bounds.right >= t3.canvasSize.width && i3 > 0 || t3.direction === T.left && t3.bounds.left <= 0 && i3 < 0))
              return;
            const e3 = nt(t3.particle.options.bounce.horizontal);
            t3.particle.velocity.x *= -e3;
            const o3 = t3.offset.x + t3.size;
            t3.bounds.right >= t3.canvasSize.width ? t3.particle.position.x = t3.canvasSize.width - o3 : t3.bounds.left <= 0 && (t3.particle.position.x = o3), t3.outMode === H.split && t3.particle.destroy();
          }({ particle: s3, outMode: e2, direction: i2, bounds: c2, canvasSize: d2, offset: r2, size: l2 }), function(t3) {
            if (t3.outMode !== H.bounce && t3.outMode !== H.bounceVertical && t3.outMode !== "bounceVertical" && t3.outMode !== H.split)
              return;
            const i3 = t3.particle.velocity.y;
            if (!(t3.direction === T.bottom && t3.bounds.bottom >= t3.canvasSize.height && i3 > 0 || t3.direction === T.top && t3.bounds.top <= 0 && i3 < 0))
              return;
            const e3 = nt(t3.particle.options.bounce.vertical);
            t3.particle.velocity.y *= -e3;
            const o3 = t3.offset.y + t3.size;
            t3.bounds.bottom >= t3.canvasSize.height ? t3.particle.position.y = t3.canvasSize.height - o3 : t3.bounds.top <= 0 && (t3.particle.position.y = o3), t3.outMode === H.split && t3.particle.destroy();
          }({ particle: s3, outMode: e2, direction: i2, bounds: c2, canvasSize: d2, offset: r2, size: l2 });
        }
        bounceNone(t2) {
          const i2 = this.particle;
          if (i2.options.move.distance.horizontal && (t2 === T.left || t2 === T.right) || i2.options.move.distance.vertical && (t2 === T.top || t2 === T.bottom))
            return;
          const e2 = i2.options.move.gravity, o2 = this.container;
          if (e2.enable) {
            const s3 = i2.position;
            (!e2.inverse && s3.y > o2.canvas.size.height && t2 === T.bottom || e2.inverse && s3.y < 0 && t2 === T.top) && o2.particles.remove(i2);
          } else
            mt(i2.position, o2.canvas.size, i2.getRadius(), t2) || o2.particles.remove(i2);
        }
      }
      class wi {
        constructor() {
          this.value = "#fff";
        }
        static create(t2, i2) {
          const e2 = t2 != null ? t2 : new wi();
          return i2 !== void 0 && (typeof i2 == "string" || i2 instanceof Array ? e2.load({ value: i2 }) : e2.load(i2)), e2;
        }
        load(t2) {
          (t2 == null ? void 0 : t2.value) !== void 0 && (this.value = t2.value);
        }
      }
      class xi {
        constructor() {
          this.blur = 5, this.color = new wi(), this.enable = false, this.color.value = "#00ff00";
        }
        load(t2) {
          t2 !== void 0 && (t2.blur !== void 0 && (this.blur = t2.blur), this.color = wi.create(this.color, t2.color), t2.enable !== void 0 && (this.enable = t2.enable));
        }
      }
      class ki {
        constructor() {
          this.enable = false, this.frequency = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), t2.enable !== void 0 && (this.enable = t2.enable), t2.frequency !== void 0 && (this.frequency = t2.frequency), t2.opacity !== void 0 && (this.opacity = t2.opacity));
        }
      }
      class Pi {
        constructor() {
          this.blink = false, this.color = new wi(), this.consent = false, this.distance = 100, this.enable = false, this.frequency = 1, this.opacity = 1, this.shadow = new xi(), this.triangles = new ki(), this.width = 1, this.warp = false;
        }
        load(t2) {
          t2 !== void 0 && (t2.id !== void 0 && (this.id = t2.id), t2.blink !== void 0 && (this.blink = t2.blink), this.color = wi.create(this.color, t2.color), t2.consent !== void 0 && (this.consent = t2.consent), t2.distance !== void 0 && (this.distance = t2.distance), t2.enable !== void 0 && (this.enable = t2.enable), t2.frequency !== void 0 && (this.frequency = t2.frequency), t2.opacity !== void 0 && (this.opacity = t2.opacity), this.shadow.load(t2.shadow), this.triangles.load(t2.triangles), t2.width !== void 0 && (this.width = t2.width), t2.warp !== void 0 && (this.warp = t2.warp));
        }
      }
      class zi {
        constructor() {
          this.distance = 200, this.enable = false, this.rotate = { x: 3e3, y: 3e3 };
        }
        get rotateX() {
          return this.rotate.x;
        }
        set rotateX(t2) {
          this.rotate.x = t2;
        }
        get rotateY() {
          return this.rotate.y;
        }
        set rotateY(t2) {
          this.rotate.y = t2;
        }
        load(t2) {
          var i2, e2, o2, s3;
          if (!t2)
            return;
          t2.distance !== void 0 && (this.distance = t2.distance), t2.enable !== void 0 && (this.enable = t2.enable);
          const n2 = (e2 = (i2 = t2.rotate) === null || i2 === void 0 ? void 0 : i2.x) !== null && e2 !== void 0 ? e2 : t2.rotateX;
          n2 !== void 0 && (this.rotate.x = n2);
          const a2 = (s3 = (o2 = t2.rotate) === null || o2 === void 0 ? void 0 : o2.y) !== null && s3 !== void 0 ? s3 : t2.rotateY;
          a2 !== void 0 && (this.rotate.y = a2);
        }
      }
      class Mi {
        constructor() {
          this.enable = false, this.length = 10, this.fillColor = new wi(), this.fillColor.value = "#000000";
        }
        load(t2) {
          t2 !== void 0 && (t2.enable !== void 0 && (this.enable = t2.enable), this.fillColor = wi.create(this.fillColor, t2.fillColor), t2.length !== void 0 && (this.length = t2.length));
        }
      }
      class Ci {
        constructor() {
          this.enable = false, this.minimumValue = 0;
        }
        load(t2) {
          t2 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.minimumValue !== void 0 && (this.minimumValue = t2.minimumValue));
        }
      }
      class Oi {
        constructor() {
          this.random = new Ci(), this.value = 0;
        }
        load(t2) {
          t2 && (typeof t2.random == "boolean" ? this.random.enable = t2.random : this.random.load(t2.random), t2.value !== void 0 && (this.value = st(t2.value, this.random.enable ? this.random.minimumValue : void 0)));
        }
      }
      class Si extends Oi {
        constructor() {
          super();
        }
      }
      class Ai {
        constructor() {
          this.clamp = true, this.delay = new Si(), this.enable = false;
        }
        load(t2) {
          t2 !== void 0 && (t2.clamp !== void 0 && (this.clamp = t2.clamp), this.delay.load(t2.delay), t2.enable !== void 0 && (this.enable = t2.enable), this.generator = t2.generator);
        }
      }
      class Ei {
        constructor() {
          this.offset = 0, this.value = 90;
        }
        load(t2) {
          t2 !== void 0 && (t2.offset !== void 0 && (this.offset = t2.offset), t2.value !== void 0 && (this.value = t2.value));
        }
      }
      class Ri {
        constructor() {
          this.acceleration = 9.81, this.enable = false, this.inverse = false, this.maxSpeed = 50;
        }
        load(t2) {
          t2 && (t2.acceleration !== void 0 && (this.acceleration = t2.acceleration), t2.enable !== void 0 && (this.enable = t2.enable), t2.inverse !== void 0 && (this.inverse = t2.inverse), t2.maxSpeed !== void 0 && (this.maxSpeed = t2.maxSpeed));
        }
      }
      class Ti {
        constructor() {
          this.default = H.out;
        }
        load(t2) {
          var i2, e2, o2, s3;
          t2 && (t2.default !== void 0 && (this.default = t2.default), this.bottom = (i2 = t2.bottom) !== null && i2 !== void 0 ? i2 : t2.default, this.left = (e2 = t2.left) !== null && e2 !== void 0 ? e2 : t2.default, this.right = (o2 = t2.right) !== null && o2 !== void 0 ? o2 : t2.default, this.top = (s3 = t2.top) !== null && s3 !== void 0 ? s3 : t2.default);
        }
      }
      class Ii {
        constructor() {
          this.angle = new Ei(), this.attract = new zi(), this.decay = 0, this.distance = {}, this.direction = E.none, this.drift = 0, this.enable = false, this.gravity = new Ri(), this.path = new Ai(), this.outModes = new Ti(), this.random = false, this.size = false, this.speed = 2, this.straight = false, this.trail = new Mi(), this.vibrate = false, this.warp = false;
        }
        get collisions() {
          return false;
        }
        set collisions(t2) {
        }
        get bounce() {
          return this.collisions;
        }
        set bounce(t2) {
          this.collisions = t2;
        }
        get out_mode() {
          return this.outMode;
        }
        set out_mode(t2) {
          this.outMode = t2;
        }
        get outMode() {
          return this.outModes.default;
        }
        set outMode(t2) {
          this.outModes.default = t2;
        }
        get noise() {
          return this.path;
        }
        set noise(t2) {
          this.path = t2;
        }
        load(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return;
          t2.angle !== void 0 && (typeof t2.angle == "number" ? this.angle.value = t2.angle : this.angle.load(t2.angle)), this.attract.load(t2.attract), t2.decay !== void 0 && (this.decay = t2.decay), t2.direction !== void 0 && (this.direction = t2.direction), t2.distance !== void 0 && (this.distance = typeof t2.distance == "number" ? { horizontal: t2.distance, vertical: t2.distance } : wt({}, t2.distance)), t2.drift !== void 0 && (this.drift = st(t2.drift)), t2.enable !== void 0 && (this.enable = t2.enable), this.gravity.load(t2.gravity);
          const s3 = (i2 = t2.outMode) !== null && i2 !== void 0 ? i2 : t2.out_mode;
          t2.outModes === void 0 && s3 === void 0 || (typeof t2.outModes == "string" || t2.outModes === void 0 && s3 !== void 0 ? this.outModes.load({ default: (e2 = t2.outModes) !== null && e2 !== void 0 ? e2 : s3 }) : this.outModes.load(t2.outModes)), this.path.load((o2 = t2.path) !== null && o2 !== void 0 ? o2 : t2.noise), t2.random !== void 0 && (this.random = t2.random), t2.size !== void 0 && (this.size = t2.size), t2.speed !== void 0 && (this.speed = st(t2.speed)), t2.straight !== void 0 && (this.straight = t2.straight), this.trail.load(t2.trail), t2.vibrate !== void 0 && (this.vibrate = t2.vibrate), t2.warp !== void 0 && (this.warp = t2.warp);
        }
      }
      class Di {
        constructor() {
          this.enable = false, this.area = 800, this.factor = 1e3;
        }
        get value_area() {
          return this.area;
        }
        set value_area(t2) {
          this.area = t2;
        }
        load(t2) {
          var i2;
          if (t2 === void 0)
            return;
          t2.enable !== void 0 && (this.enable = t2.enable);
          const e2 = (i2 = t2.area) !== null && i2 !== void 0 ? i2 : t2.value_area;
          e2 !== void 0 && (this.area = e2), t2.factor !== void 0 && (this.factor = t2.factor);
        }
      }
      class _i {
        constructor() {
          this.density = new Di(), this.limit = 0, this.value = 100;
        }
        get max() {
          return this.limit;
        }
        set max(t2) {
          this.limit = t2;
        }
        load(t2) {
          var i2;
          if (t2 === void 0)
            return;
          this.density.load(t2.density);
          const e2 = (i2 = t2.limit) !== null && i2 !== void 0 ? i2 : t2.max;
          e2 !== void 0 && (this.limit = e2), t2.value !== void 0 && (this.value = t2.value);
        }
      }
      class Li {
        constructor() {
          this.count = 0, this.enable = false, this.speed = 1, this.sync = false;
        }
        load(t2) {
          t2 && (t2.count !== void 0 && (this.count = t2.count), t2.enable !== void 0 && (this.enable = t2.enable), t2.speed !== void 0 && (this.speed = t2.speed), t2.sync !== void 0 && (this.sync = t2.sync));
        }
      }
      class qi extends Li {
        constructor() {
          super(), this.destroy = W.none, this.enable = false, this.minimumValue = 0, this.speed = 2, this.startValue = j.random, this.sync = false;
        }
        get opacity_min() {
          return this.minimumValue;
        }
        set opacity_min(t2) {
          this.minimumValue = t2;
        }
        load(t2) {
          var i2;
          if (t2 === void 0)
            return;
          super.load(t2), t2.destroy !== void 0 && (this.destroy = t2.destroy), t2.enable !== void 0 && (this.enable = t2.enable);
          const e2 = (i2 = t2.minimumValue) !== null && i2 !== void 0 ? i2 : t2.opacity_min;
          e2 !== void 0 && (this.minimumValue = e2), t2.speed !== void 0 && (this.speed = t2.speed), t2.startValue !== void 0 && (this.startValue = t2.startValue), t2.sync !== void 0 && (this.sync = t2.sync);
        }
      }
      class Fi extends Oi {
        constructor() {
          super(), this.animation = new qi(), this.random.minimumValue = 0.1, this.value = 1;
        }
        get anim() {
          return this.animation;
        }
        set anim(t2) {
          this.animation = t2;
        }
        load(t2) {
          var i2;
          if (!t2)
            return;
          super.load(t2);
          const e2 = (i2 = t2.animation) !== null && i2 !== void 0 ? i2 : t2.anim;
          e2 !== void 0 && (this.animation.load(e2), this.value = st(this.value, this.animation.enable ? this.animation.minimumValue : void 0));
        }
      }
      class Hi {
        constructor() {
          this.options = {}, this.type = U.circle;
        }
        get image() {
          var t2;
          return (t2 = this.options[U.image]) !== null && t2 !== void 0 ? t2 : this.options[U.images];
        }
        set image(t2) {
          this.options[U.image] = t2, this.options[U.images] = t2;
        }
        get custom() {
          return this.options;
        }
        set custom(t2) {
          this.options = t2;
        }
        get images() {
          return this.image instanceof Array ? this.image : [this.image];
        }
        set images(t2) {
          this.image = t2;
        }
        get stroke() {
          return [];
        }
        set stroke(t2) {
        }
        get character() {
          var t2;
          return (t2 = this.options[U.character]) !== null && t2 !== void 0 ? t2 : this.options[U.char];
        }
        set character(t2) {
          this.options[U.character] = t2, this.options[U.char] = t2;
        }
        get polygon() {
          var t2;
          return (t2 = this.options[U.polygon]) !== null && t2 !== void 0 ? t2 : this.options[U.star];
        }
        set polygon(t2) {
          this.options[U.polygon] = t2, this.options[U.star] = t2;
        }
        load(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return;
          const s3 = (i2 = t2.options) !== null && i2 !== void 0 ? i2 : t2.custom;
          if (s3 !== void 0)
            for (const t3 in s3) {
              const i3 = s3[t3];
              i3 !== void 0 && (this.options[t3] = wt((e2 = this.options[t3]) !== null && e2 !== void 0 ? e2 : {}, i3));
            }
          this.loadShape(t2.character, U.character, U.char, true), this.loadShape(t2.polygon, U.polygon, U.star, false), this.loadShape((o2 = t2.image) !== null && o2 !== void 0 ? o2 : t2.images, U.image, U.images, true), t2.type !== void 0 && (this.type = t2.type);
        }
        loadShape(t2, i2, e2, o2) {
          var s3, n2, a2, r2;
          t2 !== void 0 && (t2 instanceof Array ? (this.options[i2] instanceof Array || (this.options[i2] = [], this.options[e2] && !o2 || (this.options[e2] = [])), this.options[i2] = wt((s3 = this.options[i2]) !== null && s3 !== void 0 ? s3 : [], t2), this.options[e2] && !o2 || (this.options[e2] = wt((n2 = this.options[e2]) !== null && n2 !== void 0 ? n2 : [], t2))) : (this.options[i2] instanceof Array && (this.options[i2] = {}, this.options[e2] && !o2 || (this.options[e2] = {})), this.options[i2] = wt((a2 = this.options[i2]) !== null && a2 !== void 0 ? a2 : {}, t2), this.options[e2] && !o2 || (this.options[e2] = wt((r2 = this.options[e2]) !== null && r2 !== void 0 ? r2 : {}, t2))));
        }
      }
      class Vi extends Li {
        constructor() {
          super(), this.destroy = W.none, this.enable = false, this.minimumValue = 0, this.speed = 5, this.startValue = j.random, this.sync = false;
        }
        get size_min() {
          return this.minimumValue;
        }
        set size_min(t2) {
          this.minimumValue = t2;
        }
        load(t2) {
          var i2;
          if (t2 === void 0)
            return;
          super.load(t2), t2.destroy !== void 0 && (this.destroy = t2.destroy), t2.enable !== void 0 && (this.enable = t2.enable);
          const e2 = (i2 = t2.minimumValue) !== null && i2 !== void 0 ? i2 : t2.size_min;
          e2 !== void 0 && (this.minimumValue = e2), t2.speed !== void 0 && (this.speed = t2.speed), t2.startValue !== void 0 && (this.startValue = t2.startValue), t2.sync !== void 0 && (this.sync = t2.sync);
        }
      }
      class $i extends Oi {
        constructor() {
          super(), this.animation = new Vi(), this.random.minimumValue = 1, this.value = 3;
        }
        get anim() {
          return this.animation;
        }
        set anim(t2) {
          this.animation = t2;
        }
        load(t2) {
          var i2;
          if (!t2)
            return;
          super.load(t2);
          const e2 = (i2 = t2.animation) !== null && i2 !== void 0 ? i2 : t2.anim;
          e2 !== void 0 && (this.animation.load(e2), this.value = st(this.value, this.animation.enable ? this.animation.minimumValue : void 0));
        }
      }
      class Bi {
        constructor() {
          this.enable = false, this.speed = 0, this.sync = false;
        }
        load(t2) {
          t2 !== void 0 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.speed !== void 0 && (this.speed = t2.speed), t2.sync !== void 0 && (this.sync = t2.sync));
        }
      }
      class Wi extends Oi {
        constructor() {
          super(), this.animation = new Bi(), this.direction = R.clockwise, this.path = false, this.value = 0;
        }
        load(t2) {
          t2 && (super.load(t2), t2.direction !== void 0 && (this.direction = t2.direction), this.animation.load(t2.animation), t2.path !== void 0 && (this.path = t2.path));
        }
      }
      class Ni {
        constructor() {
          this.blur = 0, this.color = new wi(), this.enable = false, this.offset = { x: 0, y: 0 }, this.color.value = "#000000";
        }
        load(t2) {
          t2 !== void 0 && (t2.blur !== void 0 && (this.blur = t2.blur), this.color = wi.create(this.color, t2.color), t2.enable !== void 0 && (this.enable = t2.enable), t2.offset !== void 0 && (t2.offset.x !== void 0 && (this.offset.x = t2.offset.x), t2.offset.y !== void 0 && (this.offset.y = t2.offset.y)));
        }
      }
      class Gi {
        constructor() {
          this.count = 0, this.enable = false, this.offset = 0, this.speed = 1, this.sync = true;
        }
        load(t2) {
          t2 !== void 0 && (t2.count !== void 0 && (this.count = t2.count), t2.enable !== void 0 && (this.enable = t2.enable), t2.offset !== void 0 && (this.offset = st(t2.offset)), t2.speed !== void 0 && (this.speed = t2.speed), t2.sync !== void 0 && (this.sync = t2.sync));
        }
      }
      class Ui {
        constructor() {
          this.h = new Gi(), this.s = new Gi(), this.l = new Gi();
        }
        load(t2) {
          t2 && (this.h.load(t2.h), this.s.load(t2.s), this.l.load(t2.l));
        }
      }
      class ji extends wi {
        constructor() {
          super(), this.animation = new Ui();
        }
        static create(t2, i2) {
          const e2 = t2 != null ? t2 : new ji();
          return i2 !== void 0 && e2.load(typeof i2 == "string" ? { value: i2 } : i2), e2;
        }
        load(t2) {
          if (super.load(t2), !t2)
            return;
          const i2 = t2.animation;
          i2 !== void 0 && (i2.enable !== void 0 ? this.animation.h.load(i2) : this.animation.load(t2.animation));
        }
      }
      class Yi {
        constructor() {
          this.width = 0;
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = ji.create(this.color, t2.color)), t2.width !== void 0 && (this.width = t2.width), t2.opacity !== void 0 && (this.opacity = t2.opacity));
        }
      }
      class Xi extends Oi {
        constructor() {
          super(), this.random.minimumValue = 0.1, this.value = 1;
        }
      }
      class Qi {
        constructor() {
          this.horizontal = new Xi(), this.vertical = new Xi();
        }
        load(t2) {
          t2 && (this.horizontal.load(t2.horizontal), this.vertical.load(t2.vertical));
        }
      }
      class Ji {
        constructor() {
          this.enable = true, this.retries = 0;
        }
        load(t2) {
          t2 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.retries !== void 0 && (this.retries = t2.retries));
        }
      }
      class Zi {
        constructor() {
          this.bounce = new Qi(), this.enable = false, this.mode = F.bounce, this.overlap = new Ji();
        }
        load(t2) {
          t2 !== void 0 && (this.bounce.load(t2.bounce), t2.enable !== void 0 && (this.enable = t2.enable), t2.mode !== void 0 && (this.mode = t2.mode), this.overlap.load(t2.overlap));
        }
      }
      class Ki {
        constructor() {
          this.enable = false, this.frequency = 0.05, this.opacity = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), t2.enable !== void 0 && (this.enable = t2.enable), t2.frequency !== void 0 && (this.frequency = t2.frequency), t2.opacity !== void 0 && (this.opacity = t2.opacity));
        }
      }
      class te {
        constructor() {
          this.lines = new Ki(), this.particles = new Ki();
        }
        load(t2) {
          t2 !== void 0 && (this.lines.load(t2.lines), this.particles.load(t2.particles));
        }
      }
      class ie extends Oi {
        constructor() {
          super(), this.sync = false;
        }
        load(t2) {
          t2 && (super.load(t2), t2.sync !== void 0 && (this.sync = t2.sync));
        }
      }
      class ee extends Oi {
        constructor() {
          super(), this.random.minimumValue = 1e-4, this.sync = false;
        }
        load(t2) {
          t2 !== void 0 && (super.load(t2), t2.sync !== void 0 && (this.sync = t2.sync));
        }
      }
      class oe {
        constructor() {
          this.count = 0, this.delay = new ie(), this.duration = new ee();
        }
        load(t2) {
          t2 !== void 0 && (t2.count !== void 0 && (this.count = t2.count), this.delay.load(t2.delay), this.duration.load(t2.duration));
        }
      }
      class se extends Oi {
        constructor() {
          super(), this.value = 3;
        }
      }
      class ne extends Oi {
        constructor() {
          super(), this.value = { min: 4, max: 9 };
        }
      }
      class ae {
        constructor() {
          this.count = 1, this.factor = new se(), this.rate = new ne(), this.sizeOffset = true;
        }
        load(t2) {
          t2 && (t2.count !== void 0 && (this.count = t2.count), this.factor.load(t2.factor), this.rate.load(t2.rate), t2.particles !== void 0 && (this.particles = wt({}, t2.particles)), t2.sizeOffset !== void 0 && (this.sizeOffset = t2.sizeOffset));
        }
      }
      class re {
        constructor() {
          this.mode = _.none, this.split = new ae();
        }
        load(t2) {
          t2 && (t2.mode !== void 0 && (this.mode = t2.mode), this.split.load(t2.split));
        }
      }
      class le {
        constructor() {
          this.distance = 5, this.enable = false, this.speed = 50;
        }
        load(t2) {
          t2 && (t2.distance !== void 0 && (this.distance = st(t2.distance)), t2.enable !== void 0 && (this.enable = t2.enable), t2.speed !== void 0 && (this.speed = st(t2.speed)));
        }
      }
      class ce {
        constructor() {
          this.enable = false, this.speed = 0, this.sync = false;
        }
        load(t2) {
          t2 !== void 0 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.speed !== void 0 && (this.speed = t2.speed), t2.sync !== void 0 && (this.sync = t2.sync));
        }
      }
      class de extends Oi {
        constructor() {
          super(), this.animation = new ce(), this.direction = I.clockwise, this.enable = false, this.value = 0;
        }
        load(t2) {
          t2 && (super.load(t2), this.animation.load(t2.animation), t2.direction !== void 0 && (this.direction = t2.direction), t2.enable !== void 0 && (this.enable = t2.enable));
        }
      }
      class he {
        constructor() {
          this.enable = false, this.value = 0;
        }
        load(t2) {
          t2 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.value !== void 0 && (this.value = t2.value));
        }
      }
      class ue {
        constructor() {
          this.darken = new he(), this.enable = false, this.enlighten = new he(), this.speed = 25;
        }
        load(t2) {
          t2 && (t2.backColor !== void 0 && (this.backColor = wi.create(this.backColor, t2.backColor)), this.darken.load(t2.darken), t2.enable !== void 0 && (this.enable = t2.enable), this.enlighten.load(t2.enlighten), t2.speed !== void 0 && (this.speed = st(t2.speed)));
        }
      }
      class ve extends Oi {
        constructor() {
          super(), this.opacityRate = 1, this.sizeRate = 1, this.velocityRate = 1;
        }
        load(t2) {
          super.load(t2), t2 && (t2.opacityRate !== void 0 && (this.opacityRate = t2.opacityRate), t2.sizeRate !== void 0 && (this.sizeRate = t2.sizeRate), t2.velocityRate !== void 0 && (this.velocityRate = t2.velocityRate));
        }
      }
      class pe {
        constructor() {
          this.bounce = new Qi(), this.collisions = new Zi(), this.color = new ji(), this.destroy = new re(), this.groups = {}, this.life = new oe(), this.links = new Pi(), this.move = new Ii(), this.number = new _i(), this.opacity = new Fi(), this.reduceDuplicates = false, this.roll = new ue(), this.rotate = new Wi(), this.shadow = new Ni(), this.shape = new Hi(), this.size = new $i(), this.stroke = new Yi(), this.tilt = new de(), this.twinkle = new te(), this.wobble = new le(), this.zIndex = new ve();
        }
        get line_linked() {
          return this.links;
        }
        set line_linked(t2) {
          this.links = t2;
        }
        get lineLinked() {
          return this.links;
        }
        set lineLinked(t2) {
          this.links = t2;
        }
        load(t2) {
          var i2, e2, o2, s3, n2, a2, r2, l2;
          if (t2 === void 0)
            return;
          this.bounce.load(t2.bounce), this.color = ji.create(this.color, t2.color), this.destroy.load(t2.destroy), this.life.load(t2.life);
          const c2 = (e2 = (i2 = t2.links) !== null && i2 !== void 0 ? i2 : t2.lineLinked) !== null && e2 !== void 0 ? e2 : t2.line_linked;
          if (c2 !== void 0 && this.links.load(c2), t2.groups !== void 0)
            for (const i3 in t2.groups) {
              const e3 = t2.groups[i3];
              e3 !== void 0 && (this.groups[i3] = wt((o2 = this.groups[i3]) !== null && o2 !== void 0 ? o2 : {}, e3));
            }
          this.move.load(t2.move), this.number.load(t2.number), this.opacity.load(t2.opacity), t2.reduceDuplicates !== void 0 && (this.reduceDuplicates = t2.reduceDuplicates), this.roll.load(t2.roll), this.rotate.load(t2.rotate), this.shape.load(t2.shape), this.size.load(t2.size), this.shadow.load(t2.shadow), this.tilt.load(t2.tilt), this.twinkle.load(t2.twinkle), this.wobble.load(t2.wobble), this.zIndex.load(t2.zIndex);
          const d2 = (n2 = (s3 = t2.move) === null || s3 === void 0 ? void 0 : s3.collisions) !== null && n2 !== void 0 ? n2 : (a2 = t2.move) === null || a2 === void 0 ? void 0 : a2.bounce;
          d2 !== void 0 && (this.collisions.enable = d2), this.collisions.load(t2.collisions);
          const h2 = (r2 = t2.stroke) !== null && r2 !== void 0 ? r2 : (l2 = t2.shape) === null || l2 === void 0 ? void 0 : l2.stroke;
          h2 !== void 0 && (h2 instanceof Array ? this.stroke = h2.map((t3) => {
            const i3 = new Yi();
            return i3.load(t3), i3;
          }) : (this.stroke instanceof Array && (this.stroke = new Yi()), this.stroke.load(h2)));
        }
      }
      class fe {
        constructor(t2, i2) {
          this.container = t2, this.particle = i2;
        }
        move(t2) {
          const i2 = this.particle;
          i2.bubble.inRange = false, i2.links = [];
          for (const [, e2] of this.container.plugins) {
            if (i2.destroyed)
              break;
            e2.particleUpdate && e2.particleUpdate(i2, t2);
          }
          i2.destroyed || (this.moveParticle(t2), this.moveParallax());
        }
        moveParticle(t2) {
          var i2, e2, o2;
          const s3 = this.particle, n2 = s3.options;
          if (!n2.move.enable)
            return;
          const a2 = this.container, r2 = this.getProximitySpeedFactor(), l2 = ((i2 = s3.moveSpeed) !== null && i2 !== void 0 ? i2 : it(s3.options.move.speed) * a2.retina.pixelRatio) * a2.retina.reduceFactor, c2 = ot(s3.options.size.value) * a2.retina.pixelRatio, d2 = l2 / 2 * (n2.move.size ? s3.getRadius() / c2 : 1) * r2 * t2.factor, h2 = (e2 = s3.moveDrift) !== null && e2 !== void 0 ? e2 : it(s3.options.move.drift) * a2.retina.pixelRatio;
          this.applyPath(t2);
          const u2 = n2.move.gravity, v2 = u2.enable && u2.inverse ? -1 : 1;
          u2.enable && (s3.velocity.y += v2 * (u2.acceleration * t2.factor) / (60 * d2)), d2 && (s3.velocity.x += h2 * t2.factor / (60 * d2)), s3.velocity.multTo(1 - s3.options.move.decay);
          const p2 = s3.velocity.mult(d2), f2 = (o2 = s3.maxSpeed) !== null && o2 !== void 0 ? o2 : a2.retina.maxSpeed;
          u2.enable && (!u2.inverse && p2.y >= 0 && p2.y >= f2 || u2.inverse && p2.y <= 0 && p2.y <= -f2) && u2.maxSpeed > 0 && (p2.y = v2 * f2, d2 && (s3.velocity.y = p2.y / d2));
          const y2 = 1 - s3.options.zIndex.velocityRate * s3.zIndexFactor;
          p2.multTo(y2), s3.position.addTo(p2), n2.move.vibrate && (s3.position.x += Math.sin(s3.position.x * Math.cos(s3.position.y)), s3.position.y += Math.cos(s3.position.y * Math.sin(s3.position.x)));
          const m2 = s3.initialPosition, g2 = rt(m2, s3.position);
          s3.maxDistance && (g2 >= s3.maxDistance && !s3.misplaced ? (s3.misplaced = g2 > s3.maxDistance, s3.velocity.x = s3.velocity.y / 2 - s3.velocity.x, s3.velocity.y = s3.velocity.x / 2 - s3.velocity.y) : g2 < s3.maxDistance && s3.misplaced ? s3.misplaced = false : s3.misplaced && ((s3.position.x < m2.x && s3.velocity.x < 0 || s3.position.x > m2.x && s3.velocity.x > 0) && (s3.velocity.x *= -Math.random()), (s3.position.y < m2.y && s3.velocity.y < 0 || s3.position.y > m2.y && s3.velocity.y > 0) && (s3.velocity.y *= -Math.random()))), function(t3) {
            const i3 = t3.initialPosition, { dx: e3, dy: o3 } = at(i3, t3.position), s4 = Math.abs(e3), n3 = Math.abs(o3), a3 = t3.maxDistance.horizontal, r3 = t3.maxDistance.vertical;
            if (a3 || r3) {
              if ((a3 && s4 >= a3 || r3 && n3 >= r3) && !t3.misplaced)
                t3.misplaced = !!a3 && s4 > a3 || !!r3 && n3 > r3, a3 && (t3.velocity.x = t3.velocity.y / 2 - t3.velocity.x), r3 && (t3.velocity.y = t3.velocity.x / 2 - t3.velocity.y);
              else if ((!a3 || s4 < a3) && (!r3 || n3 < r3) && t3.misplaced)
                t3.misplaced = false;
              else if (t3.misplaced) {
                const e4 = t3.position, o4 = t3.velocity;
                a3 && (e4.x < i3.x && o4.x < 0 || e4.x > i3.x && o4.x > 0) && (o4.x *= -Math.random()), r3 && (e4.y < i3.y && o4.y < 0 || e4.y > i3.y && o4.y > 0) && (o4.y *= -Math.random());
              }
            }
          }(s3);
        }
        applyPath(t2) {
          const i2 = this.particle, e2 = i2.options.move.path;
          if (!e2.enable)
            return;
          const o2 = this.container;
          if (i2.lastPathTime <= i2.pathDelay)
            return void (i2.lastPathTime += t2.value);
          let s3 = o2.pathGenerator;
          if (e2.generator) {
            const t3 = si.getPathGenerator(e2.generator);
            t3 && (s3 = t3);
          }
          const n2 = s3.generate(i2);
          i2.velocity.addTo(n2), e2.clamp && (i2.velocity.x = Z(i2.velocity.x, -1, 1), i2.velocity.y = Z(i2.velocity.y, -1, 1)), i2.lastPathTime -= i2.pathDelay;
        }
        moveParallax() {
          const t2 = this.container, i2 = t2.actualOptions;
          if (vt() || !i2.interactivity.events.onHover.parallax.enable)
            return;
          const e2 = this.particle, o2 = i2.interactivity.events.onHover.parallax.force, s3 = t2.interactivity.mouse.position;
          if (!s3)
            return;
          const n2 = t2.canvas.size.width / 2, a2 = t2.canvas.size.height / 2, r2 = i2.interactivity.events.onHover.parallax.smooth, l2 = e2.getRadius() / o2, c2 = (s3.x - n2) * l2, d2 = (s3.y - a2) * l2;
          e2.offset.x += (c2 - e2.offset.x) / r2, e2.offset.y += (d2 - e2.offset.y) / r2;
        }
        getProximitySpeedFactor() {
          const t2 = this.container, i2 = t2.actualOptions;
          if (!pt(q.slow, i2.interactivity.events.onHover.mode))
            return 1;
          const e2 = this.container.interactivity.mouse.position;
          if (!e2)
            return 1;
          const o2 = rt(e2, this.particle.getPosition()), s3 = t2.retina.slowModeRadius;
          if (o2 > s3)
            return 1;
          return (o2 / s3 || 0) / i2.interactivity.modes.slow.factor;
        }
      }
      class ye extends J {
        constructor(t2, i2, e2) {
          super(t2, i2), this.z = e2 === void 0 ? t2.z : e2;
        }
        static clone(t2) {
          return ye.create(t2.x, t2.y, t2.z);
        }
        static create(t2, i2, e2) {
          return new ye(t2, i2, e2);
        }
        add(t2) {
          return t2 instanceof ye ? ye.create(this.x + t2.x, this.y + t2.y, this.z + t2.z) : super.add(t2);
        }
        addTo(t2) {
          super.addTo(t2), t2 instanceof ye && (this.z += t2.z);
        }
        sub(t2) {
          return t2 instanceof ye ? ye.create(this.x - t2.x, this.y - t2.y, this.z - t2.z) : super.sub(t2);
        }
        subFrom(t2) {
          super.subFrom(t2), t2 instanceof ye && (this.z -= t2.z);
        }
        mult(t2) {
          return ye.create(this.x * t2, this.y * t2, this.z * t2);
        }
        multTo(t2) {
          super.multTo(t2), this.z *= t2;
        }
        div(t2) {
          return ye.create(this.x / t2, this.y / t2, this.z / t2);
        }
        divTo(t2) {
          super.divTo(t2), this.z /= t2;
        }
        copy() {
          return ye.clone(this);
        }
        setTo(t2) {
          super.setTo(t2), t2 instanceof ye && (this.z = t2.z);
        }
      }
      class me {
        constructor(t2, i2, e2, o2, s3) {
          var n2, a2, r2, l2, c2, d2, h2, u2, v2;
          this.id = t2, this.container = i2, this.group = s3, this.links = [], this.fill = true, this.close = true, this.lastPathTime = 0, this.destroyed = false, this.unbreakable = false, this.splitCount = 0, this.misplaced = false, this.loops = { opacity: 0, size: 0 }, this.maxDistance = {};
          const p2 = i2.retina.pixelRatio, f2 = i2.actualOptions, y2 = new pe();
          y2.load(f2.particles);
          const m2 = y2.shape.type, g2 = y2.reduceDuplicates;
          if (this.shape = m2 instanceof Array ? yt(m2, this.id, g2) : m2, o2 == null ? void 0 : o2.shape) {
            if (o2.shape.type) {
              const t4 = o2.shape.type;
              this.shape = t4 instanceof Array ? yt(t4, this.id, g2) : t4;
            }
            const t3 = new Hi();
            if (t3.load(o2.shape), this.shape) {
              const i3 = t3.options[this.shape];
              i3 && (this.shapeData = wt({}, i3 instanceof Array ? yt(i3, this.id, g2) : i3));
            }
          } else {
            const t3 = y2.shape.options[this.shape];
            t3 && (this.shapeData = wt({}, t3 instanceof Array ? yt(t3, this.id, g2) : t3));
          }
          o2 !== void 0 && y2.load(o2), ((n2 = this.shapeData) === null || n2 === void 0 ? void 0 : n2.particles) !== void 0 && y2.load((a2 = this.shapeData) === null || a2 === void 0 ? void 0 : a2.particles), this.fill = (l2 = (r2 = this.shapeData) === null || r2 === void 0 ? void 0 : r2.fill) !== null && l2 !== void 0 ? l2 : this.fill, this.close = (d2 = (c2 = this.shapeData) === null || c2 === void 0 ? void 0 : c2.close) !== null && d2 !== void 0 ? d2 : this.close, this.options = y2;
          const b2 = it(this.options.zIndex.value);
          this.pathDelay = 1e3 * nt(this.options.move.path.delay), this.wobbleDistance = 0, i2.retina.initParticle(this);
          const w2 = this.options.color, x2 = this.options.size, k2 = nt(x2) * i2.retina.pixelRatio;
          this.size = { value: k2, max: ot(x2.value) * p2, min: et(x2.value) * p2 };
          const P2 = x2.animation;
          if (P2.enable) {
            this.size.status = B.increasing;
            const t3 = st(x2.value, P2.minimumValue * p2);
            switch (this.size.min = et(t3), this.size.max = ot(t3), P2.startValue) {
              case j.min:
                this.size.value = this.size.min, this.size.status = B.increasing;
                break;
              case j.random:
                this.size.value = tt(this.size), this.size.status = Math.random() >= 0.5 ? B.increasing : B.decreasing;
                break;
              case j.max:
              default:
                this.size.value = this.size.max, this.size.status = B.decreasing;
            }
            this.size.velocity = ((h2 = this.sizeAnimationSpeed) !== null && h2 !== void 0 ? h2 : i2.retina.sizeAnimationSpeed) / 100 * i2.retina.reduceFactor, P2.sync || (this.size.velocity *= Math.random());
          }
          this.direction = function(t3) {
            if (typeof t3 == "number")
              return t3 * Math.PI / 180;
            switch (t3) {
              case E.top:
                return -Math.PI / 2;
              case E.topRight:
                return -Math.PI / 4;
              case E.right:
                return 0;
              case E.bottomRight:
                return Math.PI / 4;
              case E.bottom:
                return Math.PI / 2;
              case E.bottomLeft:
                return 3 * Math.PI / 4;
              case E.left:
                return Math.PI;
              case E.topLeft:
                return -3 * Math.PI / 4;
              case E.none:
              default:
                return Math.random() * Math.PI * 2;
            }
          }(this.options.move.direction), this.bubble = { inRange: false }, this.initialVelocity = this.calculateVelocity(), this.velocity = this.initialVelocity.copy();
          const z2 = this.options.rotate;
          this.rotate = { value: it(z2.value) * Math.PI / 180 };
          let M2 = z2.direction;
          if (M2 === R.random) {
            M2 = Math.floor(2 * Math.random()) > 0 ? R.counterClockwise : R.clockwise;
          }
          switch (M2) {
            case R.counterClockwise:
            case "counterClockwise":
              this.rotate.status = B.decreasing;
              break;
            case R.clockwise:
              this.rotate.status = B.increasing;
          }
          const C2 = this.options.rotate.animation;
          C2.enable && (this.rotate.velocity = C2.speed / 360 * i2.retina.reduceFactor, C2.sync || (this.rotate.velocity *= Math.random()));
          const O2 = this.options.tilt;
          this.tilt = { value: it(O2.value) * Math.PI / 180, sinDirection: Math.random() >= 0.5 ? 1 : -1, cosDirection: Math.random() >= 0.5 ? 1 : -1 };
          let S2 = O2.direction;
          if (S2 === I.random) {
            S2 = Math.floor(2 * Math.random()) > 0 ? I.counterClockwise : I.clockwise;
          }
          switch (S2) {
            case I.counterClockwise:
            case "counterClockwise":
              this.tilt.status = B.decreasing;
              break;
            case I.clockwise:
              this.tilt.status = B.increasing;
          }
          const A2 = this.options.tilt.animation;
          A2.enable && (this.tilt.velocity = A2.speed / 360 * i2.retina.reduceFactor, A2.sync || (this.tilt.velocity *= Math.random()));
          const T2 = Tt(w2, this.id, g2);
          if (T2) {
            this.color = { h: { value: T2.h }, s: { value: T2.s }, l: { value: T2.l } };
            const t3 = this.options.color.animation;
            this.setColorAnimation(t3.h, this.color.h), this.setColorAnimation(t3.s, this.color.s), this.setColorAnimation(t3.l, this.color.l);
          }
          const D2 = this.options.roll;
          D2.enable ? (this.color && (D2.backColor ? this.backColor = Tt(D2.backColor) : D2.darken.enable ? this.backColor = { h: this.color.h.value, s: this.color.s.value, l: this.color.l.value - D2.darken.value } : D2.enlighten.enable && (this.backColor = { h: this.color.h.value, s: this.color.s.value, l: this.color.l.value + D2.darken.value })), this.rollAngle = Math.random() * Math.PI * 2, this.rollSpeed = it(D2.speed) / 360) : (this.rollAngle = 0, this.rollSpeed = 0);
          const _2 = this.options.wobble;
          _2.enable ? (this.wobbleAngle = Math.random() * Math.PI * 2, this.wobbleSpeed = it(_2.speed) / 360) : (this.wobbleAngle = 0, this.wobbleSpeed = 0), this.position = this.calcPosition(this.container, e2, Z(b2, 0, i2.zLayers)), this.initialPosition = this.position.copy(), this.offset = J.origin;
          const L2 = this.container.particles;
          L2.needsSort = L2.needsSort || L2.lastZIndex < this.position.z, L2.lastZIndex = this.position.z, this.zIndexFactor = this.position.z / i2.zLayers;
          const q2 = this.options.opacity;
          this.opacity = { max: ot(q2.value), min: et(q2.value), value: nt(q2) };
          const F2 = q2.animation;
          if (F2.enable) {
            this.opacity.status = B.increasing;
            const t3 = st(q2.value, F2.minimumValue);
            switch (this.opacity.min = et(t3), this.opacity.max = ot(t3), F2.startValue) {
              case j.min:
                this.opacity.value = this.opacity.min, this.opacity.status = B.increasing;
                break;
              case j.random:
                this.opacity.value = tt(this.opacity), this.opacity.status = Math.random() >= 0.5 ? B.increasing : B.decreasing;
                break;
              case j.max:
              default:
                this.opacity.value = this.opacity.max, this.opacity.status = B.decreasing;
            }
            this.opacity.velocity = F2.speed / 100 * i2.retina.reduceFactor, F2.sync || (this.opacity.velocity *= Math.random());
          }
          this.sides = 24;
          let H2 = i2.drawers.get(this.shape);
          H2 || (H2 = si.getShapeDrawer(this.shape), H2 && i2.drawers.set(this.shape, H2));
          const V2 = H2 == null ? void 0 : H2.getSidesCount;
          V2 && (this.sides = V2(this));
          const $2 = this.loadImageShape(i2, H2);
          $2 && (this.image = $2.image, this.fill = $2.fill, this.close = $2.close), this.stroke = this.options.stroke instanceof Array ? yt(this.options.stroke, this.id, g2) : this.options.stroke, this.strokeWidth = this.stroke.width * i2.retina.pixelRatio;
          const W2 = (u2 = Tt(this.stroke.color)) !== null && u2 !== void 0 ? u2 : this.getFillColor();
          if (W2) {
            this.strokeColor = { h: { value: W2.h }, s: { value: W2.s }, l: { value: W2.l } };
            const t3 = (v2 = this.stroke.color) === null || v2 === void 0 ? void 0 : v2.animation;
            t3 && this.strokeColor && (this.setColorAnimation(t3.h, this.strokeColor.h), this.setColorAnimation(t3.s, this.strokeColor.s), this.setColorAnimation(t3.l, this.strokeColor.l));
          }
          this.life = this.loadLife(), this.spawning = this.life.delay > 0, this.shadowColor = Rt(this.options.shadow.color), this.updater = new bi(i2, this), this.mover = new fe(i2, this), H2 && H2.particleInit && H2.particleInit(i2, this);
        }
        move(t2) {
          this.mover.move(t2);
        }
        update(t2) {
          this.updater.update(t2);
        }
        draw(t2) {
          this.container.canvas.drawParticle(this, t2);
        }
        getPosition() {
          return this.position.add(this.offset);
        }
        getRadius() {
          return this.bubble.radius || this.size.value;
        }
        getMass() {
          const t2 = this.getRadius();
          return Math.pow(t2, 2) * Math.PI / 2;
        }
        getFillColor() {
          return this.bubble.color ? this.bubble.color : this.backColor && Math.floor(this.rollAngle / (Math.PI / 2)) % 2 ? this.backColor : $t(this.color);
        }
        getStrokeColor() {
          var t2, i2;
          return (i2 = (t2 = this.bubble.color) !== null && t2 !== void 0 ? t2 : $t(this.strokeColor)) !== null && i2 !== void 0 ? i2 : this.getFillColor();
        }
        destroy(t2) {
          if (this.destroyed = true, this.bubble.inRange = false, this.links = [], this.unbreakable)
            return;
          this.destroyed = true, this.bubble.inRange = false;
          for (const [, i2] of this.container.plugins)
            i2.particleDestroyed && i2.particleDestroyed(this, t2);
          if (t2)
            return;
          this.options.destroy.mode === _.split && this.split();
        }
        reset() {
          this.loops.opacity = 0, this.loops.size = 0;
        }
        split() {
          const t2 = this.options.destroy.split;
          if (t2.count >= 0 && this.splitCount++ > t2.count)
            return;
          const i2 = it(t2.rate.value);
          for (let t3 = 0; t3 < i2; t3++)
            this.container.particles.addSplitParticle(this);
        }
        setColorAnimation(t2, i2) {
          if (t2.enable) {
            if (i2.velocity = t2.speed / 100 * this.container.retina.reduceFactor, t2.sync)
              return;
            i2.status = B.increasing, i2.velocity *= Math.random(), i2.value && (i2.value *= Math.random());
          } else
            i2.velocity = 0;
        }
        calcPosition(t2, i2, e2, o2 = 0) {
          var s3, n2;
          for (const [, o3] of t2.plugins) {
            const t3 = o3.particlePosition !== void 0 ? o3.particlePosition(i2, this) : void 0;
            if (t3 !== void 0)
              return ye.create(t3.x, t3.y, e2);
          }
          const a2 = t2.canvas.size, r2 = ye.create((s3 = i2 == null ? void 0 : i2.x) !== null && s3 !== void 0 ? s3 : Math.random() * a2.width, (n2 = i2 == null ? void 0 : i2.y) !== null && n2 !== void 0 ? n2 : Math.random() * a2.height, e2), l2 = this.options.move.outMode;
          return (pt(l2, H.bounce) || pt(l2, H.bounceHorizontal)) && (r2.x > t2.canvas.size.width - 2 * this.size.value ? r2.x -= this.size.value : r2.x < 2 * this.size.value && (r2.x += this.size.value)), (pt(l2, H.bounce) || pt(l2, H.bounceVertical)) && (r2.y > t2.canvas.size.height - 2 * this.size.value ? r2.y -= this.size.value : r2.y < 2 * this.size.value && (r2.y += this.size.value)), this.checkOverlap(r2, o2) ? this.calcPosition(t2, void 0, e2, o2 + 1) : r2;
        }
        checkOverlap(t2, i2 = 0) {
          const e2 = this.options.collisions.overlap;
          if (!e2.enable) {
            const o2 = e2.retries;
            if (o2 >= 0 && i2 > o2)
              throw new Error("Particle is overlapping and can't be placed");
            let s3 = false;
            for (const i3 of this.container.particles.array)
              if (rt(t2, i3.position) < this.size.value + i3.size.value) {
                s3 = true;
                break;
              }
            return s3;
          }
          return false;
        }
        calculateVelocity() {
          const t2 = function(t3) {
            const i3 = J.origin;
            return i3.length = 1, i3.angle = t3, i3;
          }(this.direction).copy(), i2 = this.options.move, e2 = Math.PI / 180 * i2.angle.value, o2 = Math.PI / 180 * i2.angle.offset, s3 = { left: o2 - e2 / 2, right: o2 + e2 / 2 };
          return i2.straight || (t2.angle += tt(st(s3.left, s3.right))), i2.random && typeof i2.speed == "number" && (t2.length *= Math.random()), t2;
        }
        loadImageShape(t2, i2) {
          var e2, o2, s3, n2, a2;
          if (this.shape !== U.image && this.shape !== U.images)
            return;
          const r2 = i2.getImages(t2).images, l2 = this.shapeData, c2 = (e2 = r2.find((t3) => t3.source === l2.src)) !== null && e2 !== void 0 ? e2 : r2[0], d2 = this.getFillColor();
          let h2;
          if (!c2)
            return;
          if (c2.svgData !== void 0 && l2.replaceColor && d2) {
            const t3 = function(t4, i4, e4) {
              const { svgData: o3 } = t4;
              if (!o3)
                return "";
              if (o3.includes("fill")) {
                const t5 = /(#(?:[0-9a-f]{2}){2,4}|(#[0-9a-f]{3})|(rgb|hsl)a?\((-?\d+%?[,\s]+){2,3}\s*[\d.]+%?\))|currentcolor/gi;
                return o3.replace(t5, () => qt(i4, e4));
              }
              const s5 = o3.indexOf(">");
              return `${o3.substring(0, s5)} fill="${qt(i4, e4)}"${o3.substring(s5)}`;
            }(c2, d2, this.opacity.value), i3 = new Blob([t3], { type: "image/svg+xml" }), e3 = URL || window.URL || window.webkitURL || window, s4 = e3.createObjectURL(i3), n3 = new Image();
            h2 = { data: Object.assign(Object.assign({}, c2), { svgData: t3 }), loaded: false, ratio: l2.width / l2.height, replaceColor: (o2 = l2.replaceColor) !== null && o2 !== void 0 ? o2 : l2.replace_color, source: l2.src }, n3.addEventListener("load", () => {
              this.image && (this.image.loaded = true, c2.element = n3), e3.revokeObjectURL(s4);
            }), n3.addEventListener("error", () => {
              e3.revokeObjectURL(s4), bt(l2.src).then((t4) => {
                this.image && t4 && (c2.element = t4.element, this.image.loaded = true);
              });
            }), n3.src = s4;
          } else
            h2 = { data: c2, loaded: true, ratio: l2.width / l2.height, replaceColor: (s3 = l2.replaceColor) !== null && s3 !== void 0 ? s3 : l2.replace_color, source: l2.src };
          h2.ratio || (h2.ratio = 1);
          return { image: h2, fill: (n2 = l2.fill) !== null && n2 !== void 0 ? n2 : this.fill, close: (a2 = l2.close) !== null && a2 !== void 0 ? a2 : this.close };
        }
        loadLife() {
          const t2 = this.container, i2 = this.options, e2 = i2.life, o2 = { delay: t2.retina.reduceFactor ? it(e2.delay.value) * (e2.delay.sync ? 1 : Math.random()) / t2.retina.reduceFactor * 1e3 : 0, delayTime: 0, duration: t2.retina.reduceFactor ? it(e2.duration.value) * (e2.duration.sync ? 1 : Math.random()) / t2.retina.reduceFactor * 1e3 : 0, time: 0, count: i2.life.count };
          return o2.duration <= 0 && (o2.duration = -1), o2.count <= 0 && (o2.count = -1), o2;
        }
      }
      class ge {
        constructor(t2) {
          this.container = t2, this.type = N.External;
        }
      }
      class be extends ge {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.mouse, o2 = i2.interactivity.events, s3 = o2.onDiv;
          return e2.position && o2.onHover.enable && pt(q.bounce, o2.onHover.mode) || xt(L.bounce, s3);
        }
        interact() {
          const t2 = this.container, i2 = t2.actualOptions.interactivity.events, e2 = t2.interactivity.status === St.mouseMoveEvent, o2 = i2.onHover.enable, s3 = i2.onHover.mode, n2 = i2.onDiv;
          e2 && o2 && pt(q.bounce, s3) ? this.processMouseBounce() : kt(L.bounce, n2, (t3, i3) => this.singleSelectorBounce(t3, i3));
        }
        reset() {
        }
        processMouseBounce() {
          const t2 = this.container, i2 = 10 * t2.retina.pixelRatio, e2 = t2.interactivity.mouse.position, o2 = t2.retina.bounceModeDistance;
          e2 && this.processBounce(e2, o2, new Gt(e2.x, e2.y, o2 + i2));
        }
        singleSelectorBounce(t2, i2) {
          const e2 = this.container, o2 = document.querySelectorAll(t2);
          o2.length && o2.forEach((t3) => {
            const o3 = t3, s3 = e2.retina.pixelRatio, n2 = { x: (o3.offsetLeft + o3.offsetWidth / 2) * s3, y: (o3.offsetTop + o3.offsetHeight / 2) * s3 }, a2 = o3.offsetWidth / 2 * s3, r2 = 10 * s3, l2 = i2.type === Y.circle ? new Gt(n2.x, n2.y, a2 + r2) : new Ut(o3.offsetLeft * s3 - r2, o3.offsetTop * s3 - r2, o3.offsetWidth * s3 + 2 * r2, o3.offsetHeight * s3 + 2 * r2);
            this.processBounce(n2, a2, l2);
          });
        }
        processBounce(t2, i2, e2) {
          const o2 = this.container.particles.quadTree.query(e2);
          for (const s3 of o2)
            e2 instanceof Gt ? Ct(Mt(s3), { position: t2, radius: i2, mass: Math.pow(i2, 2) * Math.PI / 2, velocity: J.create(0, 0), factor: { horizontal: 0, vertical: 0 } }) : e2 instanceof Ut && Ot(s3, gt(t2, i2));
        }
      }
      function we(t2, i2, e2, o2) {
        if (i2 > e2) {
          return Z(t2 + (i2 - e2) * o2, t2, i2);
        }
        if (i2 < e2) {
          return Z(t2 - (e2 - i2) * o2, i2, t2);
        }
      }
      class xe extends ge {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.mouse, o2 = i2.interactivity.events, s3 = o2.onDiv, n2 = xt(L.bubble, s3);
          if (!(n2 || o2.onHover.enable && e2.position || o2.onClick.enable && e2.clickPosition))
            return false;
          const a2 = o2.onHover.mode, r2 = o2.onClick.mode;
          return pt(q.bubble, a2) || pt(D.bubble, r2) || n2;
        }
        reset(t2, i2) {
          t2.bubble.inRange && !i2 || (delete t2.bubble.div, delete t2.bubble.opacity, delete t2.bubble.radius, delete t2.bubble.color);
        }
        interact() {
          const t2 = this.container.actualOptions.interactivity.events, i2 = t2.onHover, e2 = t2.onClick, o2 = i2.enable, s3 = i2.mode, n2 = e2.enable, a2 = e2.mode, r2 = t2.onDiv;
          o2 && pt(q.bubble, s3) ? this.hoverBubble() : n2 && pt(D.bubble, a2) ? this.clickBubble() : kt(L.bubble, r2, (t3, i3) => this.singleSelectorHover(t3, i3));
        }
        singleSelectorHover(t2, i2) {
          const e2 = this.container, o2 = document.querySelectorAll(t2);
          o2.length && o2.forEach((t3) => {
            const o3 = t3, s3 = e2.retina.pixelRatio, n2 = { x: (o3.offsetLeft + o3.offsetWidth / 2) * s3, y: (o3.offsetTop + o3.offsetHeight / 2) * s3 }, a2 = o3.offsetWidth / 2 * s3, r2 = i2.type === Y.circle ? new Gt(n2.x, n2.y, a2) : new Ut(o3.offsetLeft * s3, o3.offsetTop * s3, o3.offsetWidth * s3, o3.offsetHeight * s3), l2 = e2.particles.quadTree.query(r2);
            for (const t4 of l2) {
              if (!r2.contains(t4.getPosition()))
                continue;
              t4.bubble.inRange = true;
              const i3 = zt(e2.actualOptions.interactivity.modes.bubble.divs, o3);
              t4.bubble.div && t4.bubble.div === o3 || (this.reset(t4, true), t4.bubble.div = o3), this.hoverBubbleSize(t4, 1, i3), this.hoverBubbleOpacity(t4, 1, i3), this.hoverBubbleColor(t4, i3);
            }
          });
        }
        process(t2, i2, e2, o2) {
          const s3 = this.container, n2 = o2.bubbleObj.optValue;
          if (n2 === void 0)
            return;
          const a2 = s3.actualOptions.interactivity.modes.bubble.duration, r2 = s3.retina.bubbleModeDistance, l2 = o2.particlesObj.optValue, c2 = o2.bubbleObj.value, d2 = o2.particlesObj.value || 0, h2 = o2.type;
          if (n2 !== l2)
            if (s3.bubble.durationEnd)
              c2 && (h2 === G.size && delete t2.bubble.radius, h2 === G.opacity && delete t2.bubble.opacity);
            else if (i2 <= r2) {
              if ((c2 != null ? c2 : d2) !== n2) {
                const i3 = d2 - e2 * (d2 - n2) / a2;
                h2 === G.size && (t2.bubble.radius = i3), h2 === G.opacity && (t2.bubble.opacity = i3);
              }
            } else
              h2 === G.size && delete t2.bubble.radius, h2 === G.opacity && delete t2.bubble.opacity;
        }
        clickBubble() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.mouse.clickPosition;
          if (e2 === void 0)
            return;
          const o2 = t2.retina.bubbleModeDistance, s3 = t2.particles.quadTree.queryCircle(e2, o2);
          for (const o3 of s3) {
            if (!t2.bubble.clicking)
              continue;
            o3.bubble.inRange = !t2.bubble.durationEnd;
            const s4 = rt(o3.getPosition(), e2), n2 = (new Date().getTime() - (t2.interactivity.mouse.clickTime || 0)) / 1e3;
            n2 > i2.interactivity.modes.bubble.duration && (t2.bubble.durationEnd = true), n2 > 2 * i2.interactivity.modes.bubble.duration && (t2.bubble.clicking = false, t2.bubble.durationEnd = false);
            const a2 = { bubbleObj: { optValue: t2.retina.bubbleModeSize, value: o3.bubble.radius }, particlesObj: { optValue: ot(o3.options.size.value) * t2.retina.pixelRatio, value: o3.size.value }, type: G.size };
            this.process(o3, s4, n2, a2);
            const r2 = { bubbleObj: { optValue: i2.interactivity.modes.bubble.opacity, value: o3.bubble.opacity }, particlesObj: { optValue: ot(o3.options.opacity.value), value: o3.opacity.value }, type: G.opacity };
            this.process(o3, s4, n2, r2), t2.bubble.durationEnd ? delete o3.bubble.color : s4 <= t2.retina.bubbleModeDistance ? this.hoverBubbleColor(o3) : delete o3.bubble.color;
          }
        }
        hoverBubble() {
          const t2 = this.container, i2 = t2.interactivity.mouse.position;
          if (i2 === void 0)
            return;
          const e2 = t2.retina.bubbleModeDistance, o2 = t2.particles.quadTree.queryCircle(i2, e2);
          for (const s3 of o2) {
            s3.bubble.inRange = true;
            const o3 = rt(s3.getPosition(), i2), n2 = 1 - o3 / e2;
            o3 <= e2 ? n2 >= 0 && t2.interactivity.status === St.mouseMoveEvent && (this.hoverBubbleSize(s3, n2), this.hoverBubbleOpacity(s3, n2), this.hoverBubbleColor(s3)) : this.reset(s3), t2.interactivity.status === St.mouseLeaveEvent && this.reset(s3);
          }
        }
        hoverBubbleSize(t2, i2, e2) {
          const o2 = this.container, s3 = (e2 == null ? void 0 : e2.size) ? e2.size * o2.retina.pixelRatio : o2.retina.bubbleModeSize;
          if (s3 === void 0)
            return;
          const n2 = ot(t2.options.size.value) * o2.retina.pixelRatio, a2 = we(t2.size.value, s3, n2, i2);
          a2 !== void 0 && (t2.bubble.radius = a2);
        }
        hoverBubbleOpacity(t2, i2, e2) {
          var o2;
          const s3 = this.container.actualOptions, n2 = (o2 = e2 == null ? void 0 : e2.opacity) !== null && o2 !== void 0 ? o2 : s3.interactivity.modes.bubble.opacity;
          if (n2 === void 0)
            return;
          const a2 = t2.options.opacity.value, r2 = we(t2.opacity.value, n2, ot(a2), i2);
          r2 !== void 0 && (t2.bubble.opacity = r2);
        }
        hoverBubbleColor(t2, i2) {
          var e2;
          const o2 = this.container.actualOptions;
          if (t2.bubble.color === void 0) {
            const s3 = (e2 = i2 == null ? void 0 : i2.color) !== null && e2 !== void 0 ? e2 : o2.interactivity.modes.bubble.color;
            if (s3 === void 0)
              return;
            const n2 = s3 instanceof Array ? yt(s3) : s3;
            t2.bubble.color = Tt(n2);
          }
        }
      }
      class ke extends ge {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.interactivity.mouse, e2 = t2.actualOptions.interactivity.events;
          if (!e2.onHover.enable || !i2.position)
            return false;
          const o2 = e2.onHover.mode;
          return pt(q.connect, o2);
        }
        reset() {
        }
        interact() {
          const t2 = this.container;
          if (t2.actualOptions.interactivity.events.onHover.enable && t2.interactivity.status === "mousemove") {
            const i2 = t2.interactivity.mouse.position;
            if (!i2)
              return;
            const e2 = Math.abs(t2.retina.connectModeRadius), o2 = t2.particles.quadTree.queryCircle(i2, e2);
            let s3 = 0;
            for (const i3 of o2) {
              const e3 = i3.getPosition();
              for (const n2 of o2.slice(s3 + 1)) {
                const o3 = n2.getPosition(), s4 = Math.abs(t2.retina.connectModeDistance), a2 = Math.abs(e3.x - o3.x), r2 = Math.abs(e3.y - o3.y);
                a2 < s4 && r2 < s4 && t2.canvas.drawConnectLine(i3, n2);
              }
              ++s3;
            }
          }
        }
      }
      class Pe extends ge {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.interactivity.mouse, e2 = t2.actualOptions.interactivity.events;
          if (!e2.onHover.enable || !i2.position)
            return false;
          const o2 = e2.onHover.mode;
          return pt(q.grab, o2);
        }
        reset() {
        }
        interact() {
          var t2;
          const i2 = this.container, e2 = i2.actualOptions.interactivity;
          if (e2.events.onHover.enable && i2.interactivity.status === St.mouseMoveEvent) {
            const o2 = i2.interactivity.mouse.position;
            if (o2 === void 0)
              return;
            const s3 = i2.retina.grabModeDistance, n2 = i2.particles.quadTree.queryCircle(o2, s3);
            for (const a2 of n2) {
              const n3 = rt(a2.getPosition(), o2);
              if (n3 <= s3) {
                const r2 = e2.modes.grab.links, l2 = r2.opacity, c2 = l2 - n3 * l2 / s3;
                if (c2 > 0) {
                  const e3 = (t2 = r2.color) !== null && t2 !== void 0 ? t2 : a2.options.links.color;
                  if (!i2.particles.grabLineColor) {
                    const t3 = i2.actualOptions.interactivity.modes.grab.links;
                    i2.particles.grabLineColor = Vt(e3, t3.blink, t3.consent);
                  }
                  const s4 = Ht(a2, void 0, i2.particles.grabLineColor);
                  if (s4 === void 0)
                    return;
                  i2.canvas.drawGrabLine(a2, s4, c2, o2);
                }
              }
            }
          }
        }
      }
      class ze extends ge {
        constructor(t2) {
          super(t2);
        }
        interact() {
          const t2 = this.container;
          if (t2.actualOptions.interactivity.events.onHover.enable && t2.interactivity.status === "mousemove") {
            const i2 = t2.interactivity.mouse.position;
            if (!i2)
              return;
            t2.canvas.drawLight(i2);
          }
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.interactivity.mouse, e2 = t2.actualOptions.interactivity.events;
          if (!e2.onHover.enable || !i2.position)
            return false;
          const o2 = e2.onHover.mode;
          return pt(q.light, o2);
        }
        reset() {
        }
      }
      class Me extends ge {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.mouse, o2 = i2.interactivity.events;
          if (!(o2.onHover.enable && e2.position || o2.onClick.enable && e2.clickPosition))
            return false;
          const s3 = o2.onHover.mode, n2 = o2.onClick.mode;
          return pt(q.attract, s3) || pt(D.attract, n2);
        }
        reset() {
        }
        interact() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.status === St.mouseMoveEvent, o2 = i2.interactivity.events, s3 = o2.onHover.enable, n2 = o2.onHover.mode, a2 = o2.onClick.enable, r2 = o2.onClick.mode;
          e2 && s3 && pt(q.attract, n2) ? this.hoverAttract() : a2 && pt(D.attract, r2) && this.clickAttract();
        }
        hoverAttract() {
          const t2 = this.container, i2 = t2.interactivity.mouse.position;
          if (!i2)
            return;
          const e2 = t2.retina.attractModeDistance;
          this.processAttract(i2, e2, new Gt(i2.x, i2.y, e2));
        }
        processAttract(t2, i2, e2) {
          const o2 = this.container, s3 = o2.actualOptions.interactivity.modes.attract, n2 = o2.particles.quadTree.query(e2);
          for (const e3 of n2) {
            const { dx: o3, dy: n3, distance: a2 } = at(e3.position, t2), r2 = { x: o3 / a2, y: n3 / a2 }, l2 = s3.speed * s3.factor, c2 = Z(ct(1 - a2 / i2, s3.easing) * l2, 0, s3.maxSpeed);
            e3.position.x -= r2.x * c2, e3.position.y -= r2.y * c2;
          }
        }
        clickAttract() {
          const t2 = this.container;
          if (t2.attract.finish || (t2.attract.count || (t2.attract.count = 0), t2.attract.count++, t2.attract.count === t2.particles.count && (t2.attract.finish = true)), t2.attract.clicking) {
            const i2 = t2.interactivity.mouse.clickPosition;
            if (!i2)
              return;
            const e2 = t2.retina.attractModeDistance;
            this.processAttract(i2, e2, new Gt(i2.x, i2.y, e2));
          } else
            t2.attract.clicking === false && (t2.attract.particles = []);
        }
      }
      class Ce extends ge {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.mouse, o2 = i2.interactivity.events, s3 = o2.onDiv, n2 = xt(L.repulse, s3);
          if (!(n2 || o2.onHover.enable && e2.position || o2.onClick.enable && e2.clickPosition))
            return false;
          const a2 = o2.onHover.mode, r2 = o2.onClick.mode;
          return pt(q.repulse, a2) || pt(D.repulse, r2) || n2;
        }
        reset() {
        }
        interact() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.status === St.mouseMoveEvent, o2 = i2.interactivity.events, s3 = o2.onHover.enable, n2 = o2.onHover.mode, a2 = o2.onClick.enable, r2 = o2.onClick.mode, l2 = o2.onDiv;
          e2 && s3 && pt(q.repulse, n2) ? this.hoverRepulse() : a2 && pt(D.repulse, r2) ? this.clickRepulse() : kt(L.repulse, l2, (t3, i3) => this.singleSelectorRepulse(t3, i3));
        }
        singleSelectorRepulse(t2, i2) {
          const e2 = this.container, o2 = document.querySelectorAll(t2);
          o2.length && o2.forEach((t3) => {
            const o3 = t3, s3 = e2.retina.pixelRatio, n2 = { x: (o3.offsetLeft + o3.offsetWidth / 2) * s3, y: (o3.offsetTop + o3.offsetHeight / 2) * s3 }, a2 = o3.offsetWidth / 2 * s3, r2 = i2.type === Y.circle ? new Gt(n2.x, n2.y, a2) : new Ut(o3.offsetLeft * s3, o3.offsetTop * s3, o3.offsetWidth * s3, o3.offsetHeight * s3), l2 = zt(e2.actualOptions.interactivity.modes.repulse.divs, o3);
            this.processRepulse(n2, a2, r2, l2);
          });
        }
        hoverRepulse() {
          const t2 = this.container, i2 = t2.interactivity.mouse.position;
          if (!i2)
            return;
          const e2 = t2.retina.repulseModeDistance;
          this.processRepulse(i2, e2, new Gt(i2.x, i2.y, e2));
        }
        processRepulse(t2, i2, e2, o2) {
          var s3;
          const n2 = this.container, a2 = n2.actualOptions.interactivity.modes.repulse, r2 = n2.particles.quadTree.query(e2);
          for (const e3 of r2) {
            const { dx: n3, dy: r3, distance: l2 } = at(e3.position, t2), c2 = { x: n3 / l2, y: r3 / l2 }, d2 = ((s3 = o2 == null ? void 0 : o2.speed) !== null && s3 !== void 0 ? s3 : a2.speed) * a2.factor, h2 = Z(ct(1 - l2 / i2, a2.easing) * d2, 0, a2.maxSpeed);
            e3.position.x += c2.x * h2, e3.position.y += c2.y * h2;
          }
        }
        clickRepulse() {
          const t2 = this.container;
          if (t2.repulse.finish || (t2.repulse.count || (t2.repulse.count = 0), t2.repulse.count++, t2.repulse.count === t2.particles.count && (t2.repulse.finish = true)), t2.repulse.clicking) {
            const i2 = t2.retina.repulseModeDistance, e2 = Math.pow(i2 / 6, 3), o2 = t2.interactivity.mouse.clickPosition;
            if (o2 === void 0)
              return;
            const s3 = new Gt(o2.x, o2.y, e2), n2 = t2.particles.quadTree.query(s3);
            for (const i3 of n2) {
              const { dx: s4, dy: n3, distance: a2 } = at(o2, i3.position), r2 = a2 * a2;
              if (r2 <= e2) {
                t2.repulse.particles.push(i3);
                const o3 = t2.actualOptions.interactivity.modes.repulse.speed, a3 = J.create(s4, n3);
                a3.length = -e2 * o3 / r2, i3.velocity.setTo(a3);
              }
            }
          } else if (t2.repulse.clicking === false) {
            for (const i2 of t2.repulse.particles)
              i2.velocity.setTo(i2.initialVelocity);
            t2.repulse.particles = [];
          }
        }
      }
      class Oe extends ge {
        constructor(t2) {
          super(t2), this.delay = 0;
        }
        interact(t2) {
          var i2, e2, o2, s3;
          if (!this.container.retina.reduceFactor)
            return;
          const n2 = this.container, a2 = n2.actualOptions.interactivity.modes.trail, r2 = 1e3 * a2.delay / this.container.retina.reduceFactor;
          if (this.delay < r2 && (this.delay += t2.value), this.delay < r2)
            return;
          let l2 = true;
          a2.pauseOnStop && (n2.interactivity.mouse.position === this.lastPosition || ((i2 = n2.interactivity.mouse.position) === null || i2 === void 0 ? void 0 : i2.x) === ((e2 = this.lastPosition) === null || e2 === void 0 ? void 0 : e2.x) && ((o2 = n2.interactivity.mouse.position) === null || o2 === void 0 ? void 0 : o2.y) === ((s3 = this.lastPosition) === null || s3 === void 0 ? void 0 : s3.y)) && (l2 = false), n2.interactivity.mouse.position ? this.lastPosition = { x: n2.interactivity.mouse.position.x, y: n2.interactivity.mouse.position.y } : delete this.lastPosition, l2 && n2.particles.push(a2.quantity, n2.interactivity.mouse, a2.particles), this.delay -= r2;
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.actualOptions, e2 = t2.interactivity.mouse, o2 = i2.interactivity.events;
          return e2.clicking && e2.inside && !!e2.position && pt(D.trail, o2.onClick.mode) || e2.inside && !!e2.position && pt(q.trail, o2.onHover.mode);
        }
        reset() {
        }
      }
      class Se {
        constructor(t2) {
          this.container = t2, this.type = N.Particles;
        }
      }
      class Ae extends Se {
        constructor(t2) {
          super(t2);
        }
        interact(t2) {
          var i2;
          const e2 = this.container, o2 = (i2 = t2.attractDistance) !== null && i2 !== void 0 ? i2 : e2.retina.attractDistance, s3 = t2.getPosition(), n2 = e2.particles.quadTree.queryCircle(s3, o2);
          for (const i3 of n2) {
            if (t2 === i3 || !i3.options.move.attract.enable || i3.destroyed || i3.spawning)
              continue;
            const e3 = i3.getPosition(), { dx: o3, dy: n3 } = at(s3, e3), a2 = t2.options.move.attract.rotate, r2 = o3 / (1e3 * a2.x), l2 = n3 / (1e3 * a2.y);
            t2.velocity.x -= r2, t2.velocity.y -= l2, i3.velocity.x += r2, i3.velocity.y += l2;
          }
        }
        isEnabled(t2) {
          return t2.options.move.attract.enable;
        }
        reset() {
        }
      }
      class Ee extends Se {
        constructor(t2) {
          super(t2);
        }
        interact(t2) {
          const i2 = this.container;
          if (i2.actualOptions.interactivity.events.onHover.enable && i2.interactivity.status === "mousemove") {
            const e2 = this.container.interactivity.mouse.position;
            e2 && i2.canvas.drawParticleShadow(t2, e2);
          }
        }
        isEnabled() {
          const t2 = this.container, i2 = t2.interactivity.mouse, e2 = t2.actualOptions.interactivity.events;
          if (!e2.onHover.enable || !i2.position)
            return false;
          const o2 = e2.onHover.mode;
          return pt(q.light, o2);
        }
        reset() {
        }
      }
      class Re extends Se {
        constructor(t2) {
          super(t2);
        }
        isEnabled(t2) {
          return t2.options.collisions.enable;
        }
        reset() {
        }
        interact(t2) {
          const i2 = this.container, e2 = t2.getPosition(), o2 = i2.particles.quadTree.queryCircle(e2, 2 * t2.getRadius());
          for (const i3 of o2) {
            if (t2 === i3 || !i3.options.collisions.enable || t2.options.collisions.mode !== i3.options.collisions.mode || i3.destroyed || i3.spawning)
              continue;
            rt(e2, i3.getPosition()) <= t2.getRadius() + i3.getRadius() && this.resolveCollision(t2, i3);
          }
        }
        resolveCollision(t2, i2) {
          switch (t2.options.collisions.mode) {
            case F.absorb:
              this.absorb(t2, i2);
              break;
            case F.bounce:
              !function(t3, i3) {
                Ct(Mt(t3), Mt(i3));
              }(t2, i2);
              break;
            case F.destroy:
              !function(t3, i3) {
                t3.getRadius() === void 0 && i3.getRadius() !== void 0 ? t3.destroy() : t3.getRadius() !== void 0 && i3.getRadius() === void 0 ? i3.destroy() : t3.getRadius() !== void 0 && i3.getRadius() !== void 0 && (t3.getRadius() >= i3.getRadius() ? i3.destroy() : t3.destroy());
              }(t2, i2);
          }
        }
        absorb(t2, i2) {
          const e2 = this.container, o2 = e2.actualOptions.fpsLimit / 1e3;
          if (t2.getRadius() === void 0 && i2.getRadius() !== void 0)
            t2.destroy();
          else if (t2.getRadius() !== void 0 && i2.getRadius() === void 0)
            i2.destroy();
          else if (t2.getRadius() !== void 0 && i2.getRadius() !== void 0)
            if (t2.getRadius() >= i2.getRadius()) {
              const s3 = Z(t2.getRadius() / i2.getRadius(), 0, i2.getRadius()) * o2;
              t2.size.value += s3, i2.size.value -= s3, i2.getRadius() <= e2.retina.pixelRatio && (i2.size.value = 0, i2.destroy());
            } else {
              const s3 = Z(i2.getRadius() / t2.getRadius(), 0, t2.getRadius()) * o2;
              t2.size.value -= s3, i2.size.value += s3, t2.getRadius() <= e2.retina.pixelRatio && (t2.size.value = 0, t2.destroy());
            }
        }
      }
      class Te extends Se {
        constructor(t2) {
          super(t2);
        }
        isEnabled(t2) {
          return t2.options.links.enable;
        }
        reset() {
        }
        interact(t2) {
          var i2;
          const e2 = this.container, o2 = t2.options.links, s3 = o2.opacity, n2 = (i2 = t2.linksDistance) !== null && i2 !== void 0 ? i2 : e2.retina.linksDistance, a2 = e2.canvas.size, r2 = o2.warp, l2 = t2.getPosition(), c2 = r2 ? new jt(l2.x, l2.y, n2, a2) : new Gt(l2.x, l2.y, n2), d2 = e2.particles.quadTree.query(c2);
          for (const i3 of d2) {
            const c3 = i3.options.links;
            if (t2 === i3 || !c3.enable || o2.id !== c3.id || i3.spawning || i3.destroyed || t2.links.map((t3) => t3.destination).indexOf(i3) !== -1 || i3.links.map((t3) => t3.destination).indexOf(t2) !== -1)
              continue;
            const d3 = i3.getPosition();
            let h2 = rt(l2, d3);
            if (r2 && h2 > n2) {
              if (h2 = rt(l2, { x: d3.x - a2.width, y: d3.y }), h2 > n2) {
                if (h2 = rt(l2, { x: d3.x - a2.width, y: d3.y - a2.height }), h2 > n2) {
                  h2 = rt(l2, { x: d3.x, y: d3.y - a2.height });
                }
              }
            }
            if (h2 > n2)
              return;
            const u2 = (1 - h2 / n2) * s3, v2 = t2.options.links;
            let p2 = v2.id !== void 0 ? e2.particles.linksColors.get(v2.id) : e2.particles.linksColor;
            if (!p2) {
              p2 = Vt(v2.color, v2.blink, v2.consent), v2.id !== void 0 ? e2.particles.linksColors.set(v2.id, p2) : e2.particles.linksColor = p2;
            }
            t2.links.push({ destination: i3, opacity: u2 });
          }
        }
      }
      class Ie {
        constructor(t2) {
          this.container = t2;
          const i2 = si.getInteractors(t2);
          this.externalInteractors = [new be(t2), new xe(t2), new ke(t2), new Pe(t2), new ze(t2), new Me(t2), new Ce(t2), new Oe(t2)], this.particleInteractors = [new Ae(t2), new Ee(t2), new Re(t2), new Te(t2)];
          for (const t3 of i2)
            switch (t3.type) {
              case N.External:
                this.externalInteractors.push(t3);
                break;
              case N.Particles:
                this.particleInteractors.push(t3);
            }
        }
        externalInteract(t2) {
          for (const i2 of this.externalInteractors)
            i2.isEnabled() && i2.interact(t2);
        }
        particlesInteract(t2, i2) {
          for (const i3 of this.externalInteractors)
            i3.reset(t2);
          for (const e2 of this.particleInteractors)
            e2.isEnabled(t2) && e2.interact(t2, i2);
        }
      }
      class De {
        constructor(t2) {
          this.container = t2, this.nextId = 0, this.array = [], this.zArray = [], this.limit = 0, this.needsSort = false, this.lastZIndex = 0, this.linksFreq = new Map(), this.trianglesFreq = new Map(), this.interactionManager = new Ie(t2);
          const i2 = this.container.canvas.size;
          this.linksColors = new Map(), this.quadTree = new ai(new Ut(-i2.width / 4, -i2.height / 4, 3 * i2.width / 2, 3 * i2.height / 2), 4);
        }
        get count() {
          return this.array.length;
        }
        init() {
          var t2;
          const i2 = this.container, e2 = i2.actualOptions;
          this.lastZIndex = 0, this.needsSort = false, this.linksFreq = new Map(), this.trianglesFreq = new Map();
          let o2 = false;
          for (const [, t3] of i2.plugins)
            if (t3.particlesInitialization !== void 0 && (o2 = t3.particlesInitialization()), o2)
              break;
          if (this.addManualParticles(), !o2) {
            for (const i3 in e2.particles.groups) {
              const o3 = e2.particles.groups[i3];
              for (let s3 = this.count, n2 = 0; n2 < ((t2 = o3.number) === null || t2 === void 0 ? void 0 : t2.value) && s3 < e2.particles.number.value; s3++, n2++)
                this.addParticle(void 0, o3, i3);
            }
            for (let t3 = this.count; t3 < e2.particles.number.value; t3++)
              this.addParticle();
          }
          i2.pathGenerator.init();
        }
        redraw() {
          this.clear(), this.init(), this.draw({ value: 0, factor: 0 });
        }
        removeAt(t2, i2 = 1, e2, o2) {
          if (!(t2 >= 0 && t2 <= this.count))
            return;
          let s3 = 0;
          for (let n2 = t2; s3 < i2 && n2 < this.count; n2++) {
            const t3 = this.array[n2];
            if (!t3 || t3.group !== e2)
              continue;
            t3.destroy(o2), this.array.splice(n2--, 1);
            const i3 = this.zArray.indexOf(t3);
            this.zArray.splice(i3, 1), s3++;
          }
        }
        remove(t2, i2, e2) {
          this.removeAt(this.array.indexOf(t2), void 0, i2, e2);
        }
        update(t2) {
          const i2 = this.container, e2 = [];
          i2.pathGenerator.update();
          for (const [, e3] of i2.plugins)
            e3.update !== void 0 && e3.update(t2);
          for (const i3 of this.array) {
            const o2 = this.container.canvas.resizeFactor;
            o2 && (i3.position.x *= o2.width, i3.position.y *= o2.height);
            for (const [, e3] of this.container.plugins) {
              if (i3.destroyed)
                break;
              e3.particleUpdate && e3.particleUpdate(i3, t2);
            }
            i3.move(t2), i3.destroyed ? e2.push(i3) : this.quadTree.insert(new ni(i3.getPosition(), i3));
          }
          for (const t3 of e2)
            this.remove(t3);
          this.interactionManager.externalInteract(t2);
          for (const i3 of this.container.particles.array)
            i3.update(t2), i3.destroyed || i3.spawning || this.interactionManager.particlesInteract(i3, t2);
          delete i2.canvas.resizeFactor;
        }
        draw(t2) {
          const i2 = this.container;
          i2.canvas.clear();
          const e2 = this.container.canvas.size;
          this.quadTree = new ai(new Ut(-e2.width / 4, -e2.height / 4, 3 * e2.width / 2, 3 * e2.height / 2), 4), this.update(t2), this.needsSort && (this.zArray.sort((t3, i3) => i3.position.z - t3.position.z || t3.id - i3.id), this.lastZIndex = this.zArray[this.zArray.length - 1].position.z, this.needsSort = false);
          for (const [, e3] of i2.plugins)
            i2.canvas.drawPlugin(e3, t2);
          for (const i3 of this.zArray)
            i3.draw(t2);
        }
        clear() {
          this.array = [], this.zArray = [];
        }
        push(t2, i2, e2, o2) {
          this.pushing = true;
          for (let s3 = 0; s3 < t2; s3++)
            this.addParticle(i2 == null ? void 0 : i2.position, e2, o2);
          this.pushing = false;
        }
        addParticle(t2, i2, e2) {
          const o2 = this.container, s3 = o2.actualOptions.particles.number.limit * o2.density;
          if (s3 > 0) {
            const t3 = this.count + 1 - s3;
            t3 > 0 && this.removeQuantity(t3);
          }
          return this.pushParticle(t2, i2, e2);
        }
        addSplitParticle(t2) {
          const i2 = t2.options.destroy.split, e2 = new pe();
          e2.load(t2.options);
          const o2 = it(i2.factor.value);
          e2.color.load({ value: { hsl: t2.getFillColor() } }), typeof e2.size.value == "number" ? e2.size.value /= o2 : (e2.size.value.min /= o2, e2.size.value.max /= o2), e2.load(i2.particles);
          const s3 = i2.sizeOffset ? st(-t2.size.value, t2.size.value) : 0, n2 = { x: t2.position.x + tt(s3), y: t2.position.y + tt(s3) };
          return this.pushParticle(n2, e2, t2.group, (i3) => !(i3.size.value < 0.5) && (i3.velocity.length = tt(st(t2.velocity.length, i3.velocity.length)), i3.splitCount = t2.splitCount + 1, i3.unbreakable = true, setTimeout(() => {
            i3.unbreakable = false;
          }, 500), true));
        }
        removeQuantity(t2, i2) {
          this.removeAt(0, t2, i2);
        }
        getLinkFrequency(t2, i2) {
          const e2 = `${Math.min(t2.id, i2.id)}_${Math.max(t2.id, i2.id)}`;
          let o2 = this.linksFreq.get(e2);
          return o2 === void 0 && (o2 = Math.random(), this.linksFreq.set(e2, o2)), o2;
        }
        getTriangleFrequency(t2, i2, e2) {
          let [o2, s3, n2] = [t2.id, i2.id, e2.id];
          o2 > s3 && ([s3, o2] = [o2, s3]), s3 > n2 && ([n2, s3] = [s3, n2]), o2 > n2 && ([n2, o2] = [o2, n2]);
          const a2 = `${o2}_${s3}_${n2}`;
          let r2 = this.trianglesFreq.get(a2);
          return r2 === void 0 && (r2 = Math.random(), this.trianglesFreq.set(a2, r2)), r2;
        }
        addManualParticles() {
          const t2 = this.container, i2 = t2.actualOptions;
          for (const e2 of i2.manualParticles) {
            const i3 = e2.position ? { x: e2.position.x * t2.canvas.size.width / 100, y: e2.position.y * t2.canvas.size.height / 100 } : void 0;
            this.addParticle(i3, e2.options);
          }
        }
        setDensity() {
          const t2 = this.container.actualOptions;
          for (const i2 in t2.particles.groups)
            this.applyDensity(t2.particles.groups[i2], 0, i2);
          this.applyDensity(t2.particles, t2.manualParticles.length);
        }
        applyDensity(t2, i2, e2) {
          var o2;
          if (!((o2 = t2.number.density) === null || o2 === void 0 ? void 0 : o2.enable))
            return;
          const s3 = t2.number, n2 = this.initDensityFactor(s3.density), a2 = s3.value, r2 = s3.limit > 0 ? s3.limit : a2, l2 = Math.min(a2, r2) * n2 + i2, c2 = Math.min(this.count, this.array.filter((t3) => t3.group === e2).length);
          this.limit = s3.limit * n2, c2 < l2 ? this.push(Math.abs(l2 - c2), void 0, t2, e2) : c2 > l2 && this.removeQuantity(c2 - l2, e2);
        }
        initDensityFactor(t2) {
          const i2 = this.container;
          if (!i2.canvas.element || !t2.enable)
            return 1;
          const e2 = i2.canvas.element, o2 = i2.retina.pixelRatio;
          return e2.width * e2.height / (t2.factor * Math.pow(o2, 2) * t2.area);
        }
        pushParticle(t2, i2, e2, o2) {
          try {
            const s3 = new me(this.nextId, this.container, t2, i2, e2);
            let n2 = true;
            if (o2 && (n2 = o2(s3)), !n2)
              return;
            return this.array.push(s3), this.zArray.push(s3), this.nextId++, s3;
          } catch (t3) {
            return void console.warn(`error adding particle: ${t3}`);
          }
        }
      }
      class _e {
        constructor(t2) {
          this.container = t2;
        }
        init() {
          const t2 = this.container, i2 = t2.actualOptions;
          this.pixelRatio = !i2.detectRetina || vt() ? 1 : window.devicePixelRatio;
          const e2 = this.container.actualOptions.motion;
          if (e2 && (e2.disable || e2.reduce.value))
            if (vt() || typeof matchMedia == "undefined" || !matchMedia)
              this.reduceFactor = 1;
            else {
              const i3 = matchMedia("(prefers-reduced-motion: reduce)");
              if (i3) {
                this.handleMotionChange(i3);
                const e3 = () => {
                  this.handleMotionChange(i3), t2.refresh().catch(() => {
                  });
                };
                i3.addEventListener !== void 0 ? i3.addEventListener("change", e3) : i3.addListener !== void 0 && i3.addListener(e3);
              }
            }
          else
            this.reduceFactor = 1;
          const o2 = this.pixelRatio;
          if (t2.canvas.element) {
            const i3 = t2.canvas.element;
            t2.canvas.size.width = i3.offsetWidth * o2, t2.canvas.size.height = i3.offsetHeight * o2;
          }
          const s3 = i2.particles;
          this.attractDistance = s3.move.attract.distance * o2, this.linksDistance = s3.links.distance * o2, this.linksWidth = s3.links.width * o2, this.sizeAnimationSpeed = s3.size.animation.speed * o2, this.maxSpeed = s3.move.gravity.maxSpeed * o2;
          const n2 = i2.interactivity.modes;
          this.connectModeDistance = n2.connect.distance * o2, this.connectModeRadius = n2.connect.radius * o2, this.grabModeDistance = n2.grab.distance * o2, this.repulseModeDistance = n2.repulse.distance * o2, this.bounceModeDistance = n2.bounce.distance * o2, this.attractModeDistance = n2.attract.distance * o2, this.slowModeRadius = n2.slow.radius * o2, this.bubbleModeDistance = n2.bubble.distance * o2, n2.bubble.size && (this.bubbleModeSize = n2.bubble.size * o2);
        }
        initParticle(t2) {
          const i2 = t2.options, e2 = this.pixelRatio, o2 = i2.move.distance;
          t2.attractDistance = i2.move.attract.distance * e2, t2.linksDistance = i2.links.distance * e2, t2.linksWidth = i2.links.width * e2, t2.moveDrift = it(i2.move.drift) * e2, t2.moveSpeed = it(i2.move.speed) * e2, t2.sizeAnimationSpeed = i2.size.animation.speed * e2;
          const s3 = t2.maxDistance;
          s3.horizontal = o2.horizontal !== void 0 ? o2.horizontal * e2 : void 0, s3.vertical = o2.vertical !== void 0 ? o2.vertical * e2 : void 0, t2.wobbleDistance = it(i2.wobble.distance) * e2, t2.maxSpeed = i2.move.gravity.maxSpeed * e2;
        }
        handleMotionChange(t2) {
          const i2 = this.container.actualOptions;
          if (t2.matches) {
            const t3 = i2.motion;
            this.reduceFactor = t3.disable ? 0 : t3.reduce.value ? 1 / t3.reduce.factor : 1;
          } else
            this.reduceFactor = 1;
        }
      }
      class Le {
        constructor(t2) {
          this.container = t2;
        }
        nextFrame(t2) {
          try {
            const i2 = this.container;
            if (i2.lastFrameTime !== void 0 && t2 < i2.lastFrameTime + 1e3 / i2.fpsLimit)
              return void i2.draw();
            const e2 = t2 - i2.lastFrameTime, o2 = { value: e2, factor: 60 * e2 / 1e3 };
            i2.lastFrameTime = t2, i2.particles.draw(o2), i2.getAnimationStatus() && i2.draw();
          } catch (t3) {
            console.error("tsParticles error in animation loop", t3);
          }
        }
      }
      class qe {
        constructor() {
          this.enable = false, this.mode = [];
        }
        load(t2) {
          t2 !== void 0 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.mode !== void 0 && (this.mode = t2.mode));
        }
      }
      class Fe {
        constructor() {
          this.selectors = [], this.enable = false, this.mode = [], this.type = Y.circle;
        }
        get elementId() {
          return this.ids;
        }
        set elementId(t2) {
          this.ids = t2;
        }
        get el() {
          return this.elementId;
        }
        set el(t2) {
          this.elementId = t2;
        }
        get ids() {
          return this.selectors instanceof Array ? this.selectors.map((t2) => t2.replace("#", "")) : this.selectors.replace("#", "");
        }
        set ids(t2) {
          this.selectors = t2 instanceof Array ? t2.map((t3) => `#${t3}`) : `#${t2}`;
        }
        load(t2) {
          var i2, e2;
          if (t2 === void 0)
            return;
          const o2 = (e2 = (i2 = t2.ids) !== null && i2 !== void 0 ? i2 : t2.elementId) !== null && e2 !== void 0 ? e2 : t2.el;
          o2 !== void 0 && (this.ids = o2), t2.selectors !== void 0 && (this.selectors = t2.selectors), t2.enable !== void 0 && (this.enable = t2.enable), t2.mode !== void 0 && (this.mode = t2.mode), t2.type !== void 0 && (this.type = t2.type);
        }
      }
      class He {
        constructor() {
          this.enable = false, this.force = 2, this.smooth = 10;
        }
        load(t2) {
          t2 !== void 0 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.force !== void 0 && (this.force = t2.force), t2.smooth !== void 0 && (this.smooth = t2.smooth));
        }
      }
      class Ve {
        constructor() {
          this.enable = false, this.mode = [], this.parallax = new He();
        }
        load(t2) {
          t2 !== void 0 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.mode !== void 0 && (this.mode = t2.mode), this.parallax.load(t2.parallax));
        }
      }
      class $e {
        constructor() {
          this.onClick = new qe(), this.onDiv = new Fe(), this.onHover = new Ve(), this.resize = true;
        }
        get onclick() {
          return this.onClick;
        }
        set onclick(t2) {
          this.onClick = t2;
        }
        get ondiv() {
          return this.onDiv;
        }
        set ondiv(t2) {
          this.onDiv = t2;
        }
        get onhover() {
          return this.onHover;
        }
        set onhover(t2) {
          this.onHover = t2;
        }
        load(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return;
          this.onClick.load((i2 = t2.onClick) !== null && i2 !== void 0 ? i2 : t2.onclick);
          const s3 = (e2 = t2.onDiv) !== null && e2 !== void 0 ? e2 : t2.ondiv;
          s3 !== void 0 && (s3 instanceof Array ? this.onDiv = s3.map((t3) => {
            const i3 = new Fe();
            return i3.load(t3), i3;
          }) : (this.onDiv = new Fe(), this.onDiv.load(s3))), this.onHover.load((o2 = t2.onHover) !== null && o2 !== void 0 ? o2 : t2.onhover), t2.resize !== void 0 && (this.resize = t2.resize);
        }
      }
      class Be {
        constructor() {
          this.distance = 200, this.duration = 0.4;
        }
        load(t2) {
          t2 !== void 0 && (t2.distance !== void 0 && (this.distance = t2.distance), t2.duration !== void 0 && (this.duration = t2.duration), t2.opacity !== void 0 && (this.opacity = t2.opacity), t2.color !== void 0 && (t2.color instanceof Array ? this.color = t2.color.map((t3) => wi.create(void 0, t3)) : (this.color instanceof Array && (this.color = new wi()), this.color = wi.create(this.color, t2.color))), t2.size !== void 0 && (this.size = t2.size));
        }
      }
      class We extends Be {
        constructor() {
          super(), this.selectors = [];
        }
        get ids() {
          return this.selectors instanceof Array ? this.selectors.map((t2) => t2.replace("#", "")) : this.selectors.replace("#", "");
        }
        set ids(t2) {
          this.selectors = t2 instanceof Array ? t2.map((t3) => `#${t3}`) : `#${t2}`;
        }
        load(t2) {
          super.load(t2), t2 !== void 0 && (t2.ids !== void 0 && (this.ids = t2.ids), t2.selectors !== void 0 && (this.selectors = t2.selectors));
        }
      }
      class Ne extends Be {
        load(t2) {
          super.load(t2), t2 !== void 0 && t2.divs !== void 0 && (t2.divs instanceof Array ? this.divs = t2.divs.map((t3) => {
            const i2 = new We();
            return i2.load(t3), i2;
          }) : ((this.divs instanceof Array || !this.divs) && (this.divs = new We()), this.divs.load(t2.divs)));
        }
      }
      class Ge {
        constructor() {
          this.opacity = 0.5;
        }
        load(t2) {
          t2 !== void 0 && t2.opacity !== void 0 && (this.opacity = t2.opacity);
        }
      }
      class Ue {
        constructor() {
          this.distance = 80, this.links = new Ge(), this.radius = 60;
        }
        get line_linked() {
          return this.links;
        }
        set line_linked(t2) {
          this.links = t2;
        }
        get lineLinked() {
          return this.links;
        }
        set lineLinked(t2) {
          this.links = t2;
        }
        load(t2) {
          var i2, e2;
          t2 !== void 0 && (t2.distance !== void 0 && (this.distance = t2.distance), this.links.load((e2 = (i2 = t2.links) !== null && i2 !== void 0 ? i2 : t2.lineLinked) !== null && e2 !== void 0 ? e2 : t2.line_linked), t2.radius !== void 0 && (this.radius = t2.radius));
        }
      }
      class je {
        constructor() {
          this.blink = false, this.consent = false, this.opacity = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.blink !== void 0 && (this.blink = t2.blink), t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), t2.consent !== void 0 && (this.consent = t2.consent), t2.opacity !== void 0 && (this.opacity = t2.opacity));
        }
      }
      class Ye {
        constructor() {
          this.distance = 100, this.links = new je();
        }
        get line_linked() {
          return this.links;
        }
        set line_linked(t2) {
          this.links = t2;
        }
        get lineLinked() {
          return this.links;
        }
        set lineLinked(t2) {
          this.links = t2;
        }
        load(t2) {
          var i2, e2;
          t2 !== void 0 && (t2.distance !== void 0 && (this.distance = t2.distance), this.links.load((e2 = (i2 = t2.links) !== null && i2 !== void 0 ? i2 : t2.lineLinked) !== null && e2 !== void 0 ? e2 : t2.line_linked));
        }
      }
      class Xe {
        constructor() {
          this.quantity = 2;
        }
        get particles_nb() {
          return this.quantity;
        }
        set particles_nb(t2) {
          this.quantity = t2;
        }
        load(t2) {
          var i2;
          if (t2 === void 0)
            return;
          const e2 = (i2 = t2.quantity) !== null && i2 !== void 0 ? i2 : t2.particles_nb;
          e2 !== void 0 && (this.quantity = e2);
        }
      }
      class Qe {
        constructor() {
          this.default = true, this.groups = [], this.quantity = 4;
        }
        get particles_nb() {
          return this.quantity;
        }
        set particles_nb(t2) {
          this.quantity = t2;
        }
        load(t2) {
          var i2;
          if (t2 === void 0)
            return;
          t2.default !== void 0 && (this.default = t2.default), t2.groups !== void 0 && (this.groups = t2.groups.map((t3) => t3)), this.groups.length || (this.default = true);
          const e2 = (i2 = t2.quantity) !== null && i2 !== void 0 ? i2 : t2.particles_nb;
          e2 !== void 0 && (this.quantity = e2);
        }
      }
      class Je {
        constructor() {
          this.distance = 200, this.duration = 0.4, this.factor = 100, this.speed = 1, this.maxSpeed = 50, this.easing = X.easeOutQuad;
        }
        load(t2) {
          t2 && (t2.distance !== void 0 && (this.distance = t2.distance), t2.duration !== void 0 && (this.duration = t2.duration), t2.easing !== void 0 && (this.easing = t2.easing), t2.factor !== void 0 && (this.factor = t2.factor), t2.speed !== void 0 && (this.speed = t2.speed), t2.maxSpeed !== void 0 && (this.maxSpeed = t2.maxSpeed));
        }
      }
      class Ze extends Je {
        constructor() {
          super(), this.selectors = [];
        }
        get ids() {
          return this.selectors instanceof Array ? this.selectors.map((t2) => t2.replace("#", "")) : this.selectors.replace("#", "");
        }
        set ids(t2) {
          this.selectors = t2 instanceof Array ? t2.map(() => `#${t2}`) : `#${t2}`;
        }
        load(t2) {
          super.load(t2), t2 !== void 0 && (t2.ids !== void 0 && (this.ids = t2.ids), t2.selectors !== void 0 && (this.selectors = t2.selectors));
        }
      }
      class Ke extends Je {
        load(t2) {
          super.load(t2), (t2 == null ? void 0 : t2.divs) !== void 0 && (t2.divs instanceof Array ? this.divs = t2.divs.map((t3) => {
            const i2 = new Ze();
            return i2.load(t3), i2;
          }) : ((this.divs instanceof Array || !this.divs) && (this.divs = new Ze()), this.divs.load(t2.divs)));
        }
      }
      class to {
        constructor() {
          this.factor = 3, this.radius = 200;
        }
        get active() {
          return false;
        }
        set active(t2) {
        }
        load(t2) {
          t2 !== void 0 && (t2.factor !== void 0 && (this.factor = t2.factor), t2.radius !== void 0 && (this.radius = t2.radius));
        }
      }
      class io {
        constructor() {
          this.delay = 1, this.pauseOnStop = false, this.quantity = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.delay !== void 0 && (this.delay = t2.delay), t2.quantity !== void 0 && (this.quantity = t2.quantity), t2.particles !== void 0 && (this.particles = wt({}, t2.particles)), t2.pauseOnStop !== void 0 && (this.pauseOnStop = t2.pauseOnStop));
        }
      }
      class eo {
        constructor() {
          this.distance = 200, this.duration = 0.4, this.easing = X.easeOutQuad, this.factor = 1, this.maxSpeed = 50, this.speed = 1;
        }
        load(t2) {
          t2 && (t2.distance !== void 0 && (this.distance = t2.distance), t2.duration !== void 0 && (this.duration = t2.duration), t2.easing !== void 0 && (this.easing = t2.easing), t2.factor !== void 0 && (this.factor = t2.factor), t2.maxSpeed !== void 0 && (this.maxSpeed = t2.maxSpeed), t2.speed !== void 0 && (this.speed = t2.speed));
        }
      }
      class oo {
        constructor() {
          this.start = new wi(), this.stop = new wi(), this.start.value = "#ffffff", this.stop.value = "#000000";
        }
        load(t2) {
          t2 !== void 0 && (this.start = wi.create(this.start, t2.start), this.stop = wi.create(this.stop, t2.stop));
        }
      }
      class so {
        constructor() {
          this.gradient = new oo(), this.radius = 1e3;
        }
        load(t2) {
          t2 !== void 0 && (this.gradient.load(t2.gradient), t2.radius !== void 0 && (this.radius = t2.radius));
        }
      }
      class no {
        constructor() {
          this.color = new wi(), this.color.value = "#000000", this.length = 2e3;
        }
        load(t2) {
          t2 !== void 0 && (this.color = wi.create(this.color, t2.color), t2.length !== void 0 && (this.length = t2.length));
        }
      }
      class ao {
        constructor() {
          this.area = new so(), this.shadow = new no();
        }
        load(t2) {
          t2 !== void 0 && (this.area.load(t2.area), this.shadow.load(t2.shadow));
        }
      }
      class ro {
        constructor() {
          this.distance = 200;
        }
        load(t2) {
          t2 && t2.distance !== void 0 && (this.distance = t2.distance);
        }
      }
      class lo {
        constructor() {
          this.attract = new eo(), this.bounce = new ro(), this.bubble = new Ne(), this.connect = new Ue(), this.grab = new Ye(), this.light = new ao(), this.push = new Qe(), this.remove = new Xe(), this.repulse = new Ke(), this.slow = new to(), this.trail = new io();
        }
        load(t2) {
          t2 !== void 0 && (this.attract.load(t2.attract), this.bubble.load(t2.bubble), this.connect.load(t2.connect), this.grab.load(t2.grab), this.light.load(t2.light), this.push.load(t2.push), this.remove.load(t2.remove), this.repulse.load(t2.repulse), this.slow.load(t2.slow), this.trail.load(t2.trail));
        }
      }
      class co {
        constructor() {
          this.detectsOn = Q.canvas, this.events = new $e(), this.modes = new lo();
        }
        get detect_on() {
          return this.detectsOn;
        }
        set detect_on(t2) {
          this.detectsOn = t2;
        }
        load(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return;
          const s3 = (i2 = t2.detectsOn) !== null && i2 !== void 0 ? i2 : t2.detect_on;
          s3 !== void 0 && (this.detectsOn = s3), this.events.load(t2.events), this.modes.load(t2.modes), ((o2 = (e2 = t2.modes) === null || e2 === void 0 ? void 0 : e2.slow) === null || o2 === void 0 ? void 0 : o2.active) === true && (this.events.onHover.mode instanceof Array ? this.events.onHover.mode.indexOf(q.slow) < 0 && this.events.onHover.mode.push(q.slow) : this.events.onHover.mode !== q.slow && (this.events.onHover.mode = [this.events.onHover.mode, q.slow]));
        }
      }
      class ho {
        constructor() {
          this.color = new wi(), this.opacity = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), t2.opacity !== void 0 && (this.opacity = t2.opacity));
        }
      }
      class uo {
        constructor() {
          this.composite = "destination-out", this.cover = new ho(), this.enable = false;
        }
        load(t2) {
          if (t2 !== void 0) {
            if (t2.composite !== void 0 && (this.composite = t2.composite), t2.cover !== void 0) {
              const i2 = t2.cover, e2 = typeof t2.cover == "string" ? { color: t2.cover } : t2.cover;
              this.cover.load(i2.color !== void 0 ? i2 : { color: e2 });
            }
            t2.enable !== void 0 && (this.enable = t2.enable);
          }
        }
      }
      class vo {
        constructor() {
          this.color = new wi(), this.color.value = "", this.image = "", this.position = "", this.repeat = "", this.size = "", this.opacity = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), t2.image !== void 0 && (this.image = t2.image), t2.position !== void 0 && (this.position = t2.position), t2.repeat !== void 0 && (this.repeat = t2.repeat), t2.size !== void 0 && (this.size = t2.size), t2.opacity !== void 0 && (this.opacity = t2.opacity));
        }
      }
      class po {
        constructor() {
          this.mode = $.any, this.value = false;
        }
        load(t2) {
          t2 !== void 0 && (t2.mode !== void 0 && (this.mode = t2.mode), t2.value !== void 0 && (this.value = t2.value));
        }
      }
      class fo {
        constructor() {
          this.name = "", this.default = new po();
        }
        load(t2) {
          t2 !== void 0 && (t2.name !== void 0 && (this.name = t2.name), this.default.load(t2.default), t2.options !== void 0 && (this.options = wt({}, t2.options)));
        }
      }
      class yo {
        constructor() {
          this.enable = false, this.zIndex = -1;
        }
        load(t2) {
          t2 && (t2.enable !== void 0 && (this.enable = t2.enable), t2.zIndex !== void 0 && (this.zIndex = t2.zIndex));
        }
      }
      class mo {
        constructor() {
          this.factor = 4, this.value = true;
        }
        load(t2) {
          t2 && (t2.factor !== void 0 && (this.factor = t2.factor), t2.value !== void 0 && (this.value = t2.value));
        }
      }
      class go {
        constructor() {
          this.disable = false, this.reduce = new mo();
        }
        load(t2) {
          t2 && (t2.disable !== void 0 && (this.disable = t2.disable), this.reduce.load(t2.reduce));
        }
      }
      class bo {
        load(t2) {
          var i2, e2;
          t2 && (t2.position !== void 0 && (this.position = { x: (i2 = t2.position.x) !== null && i2 !== void 0 ? i2 : 50, y: (e2 = t2.position.y) !== null && e2 !== void 0 ? e2 : 50 }), t2.options !== void 0 && (this.options = wt({}, t2.options)));
        }
      }
      class wo {
        constructor() {
          this.maxWidth = 1 / 0, this.options = {};
        }
        load(t2) {
          t2 && (t2.maxWidth !== void 0 && (this.maxWidth = t2.maxWidth), t2.options !== void 0 && (this.options = wt({}, t2.options)));
        }
      }
      class xo {
        constructor() {
          this.autoPlay = true, this.background = new vo(), this.backgroundMask = new uo(), this.fullScreen = new yo(), this.detectRetina = true, this.fpsLimit = 60, this.interactivity = new co(), this.manualParticles = [], this.motion = new go(), this.particles = new pe(), this.pauseOnBlur = true, this.pauseOnOutsideViewport = true, this.responsive = [], this.themes = [];
        }
        get fps_limit() {
          return this.fpsLimit;
        }
        set fps_limit(t2) {
          this.fpsLimit = t2;
        }
        get retina_detect() {
          return this.detectRetina;
        }
        set retina_detect(t2) {
          this.detectRetina = t2;
        }
        get backgroundMode() {
          return this.fullScreen;
        }
        set backgroundMode(t2) {
          this.fullScreen.load(t2);
        }
        load(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return;
          if (t2.preset !== void 0)
            if (t2.preset instanceof Array)
              for (const i3 of t2.preset)
                this.importPreset(i3);
            else
              this.importPreset(t2.preset);
          t2.autoPlay !== void 0 && (this.autoPlay = t2.autoPlay);
          const s3 = (i2 = t2.detectRetina) !== null && i2 !== void 0 ? i2 : t2.retina_detect;
          s3 !== void 0 && (this.detectRetina = s3);
          const n2 = (e2 = t2.fpsLimit) !== null && e2 !== void 0 ? e2 : t2.fps_limit;
          if (n2 !== void 0 && (this.fpsLimit = n2), t2.pauseOnBlur !== void 0 && (this.pauseOnBlur = t2.pauseOnBlur), t2.pauseOnOutsideViewport !== void 0 && (this.pauseOnOutsideViewport = t2.pauseOnOutsideViewport), this.background.load(t2.background), this.fullScreen.load((o2 = t2.fullScreen) !== null && o2 !== void 0 ? o2 : t2.backgroundMode), this.backgroundMask.load(t2.backgroundMask), this.interactivity.load(t2.interactivity), t2.manualParticles !== void 0 && (this.manualParticles = t2.manualParticles.map((t3) => {
            const i3 = new bo();
            return i3.load(t3), i3;
          })), this.motion.load(t2.motion), this.particles.load(t2.particles), si.loadOptions(this, t2), t2.responsive !== void 0)
            for (const i3 of t2.responsive) {
              const t3 = new wo();
              t3.load(i3), this.responsive.push(t3);
            }
          if (this.responsive.sort((t3, i3) => t3.maxWidth - i3.maxWidth), t2.themes !== void 0)
            for (const i3 of t2.themes) {
              const t3 = new fo();
              t3.load(i3), this.themes.push(t3);
            }
        }
        setTheme(t2) {
          if (t2) {
            const i2 = this.themes.find((i3) => i3.name === t2);
            i2 && this.load(i2.options);
          } else {
            const t3 = typeof matchMedia != "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
            let i2 = this.themes.find((i3) => i3.default.value && (i3.default.mode === $.dark && t3 || i3.default.mode === $.light && !t3));
            i2 || (i2 = this.themes.find((t4) => t4.default.value && t4.default.mode === $.any)), i2 && this.load(i2.options);
          }
        }
        importPreset(t2) {
          this.load(si.getPreset(t2));
        }
        setResponsive(t2, i2, e2) {
          var o2;
          this.load(e2), this.load((o2 = this.responsive.find((e3) => e3.maxWidth * i2 > t2)) === null || o2 === void 0 ? void 0 : o2.options);
        }
      }
      var ko = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      };
      class Po {
        constructor(t2, i2, ...e2) {
          this.id = t2, this.zLayers = 1e4, this.fpsLimit = 60, this.firstStart = true, this.started = false, this.destroyed = false, this.paused = true, this.lastFrameTime = 0, this.pageHidden = false, this._sourceOptions = i2, this.retina = new _e(this), this.canvas = new mi(this), this.particles = new De(this), this.drawer = new Le(this), this.pathGenerator = { generate: () => {
            const t3 = J.create(0, 0);
            return t3.length = Math.random(), t3.angle = Math.random() * Math.PI * 2, t3;
          }, init: () => {
          }, update: () => {
          } }, this.interactivity = { mouse: { clicking: false, inside: false } }, this.bubble = {}, this.repulse = { particles: [] }, this.attract = { particles: [] }, this.plugins = new Map(), this.drawers = new Map(), this.density = 1, this._options = new xo(), this.actualOptions = new xo();
          for (const t3 of e2)
            this._options.load(si.getPreset(t3));
          const o2 = si.getSupportedShapes();
          for (const t3 of o2) {
            const i3 = si.getShapeDrawer(t3);
            i3 && this.drawers.set(t3, i3);
          }
          this._options && this._options.load(this._sourceOptions), this.eventListeners = new Xt(this), typeof IntersectionObserver != "undefined" && IntersectionObserver && (this.intersectionObserver = new IntersectionObserver((t3) => this.intersectionManager(t3)));
        }
        get options() {
          return this._options;
        }
        get sourceOptions() {
          return this._sourceOptions;
        }
        play(t2) {
          const i2 = this.paused || t2;
          if (!this.firstStart || this.actualOptions.autoPlay) {
            if (this.paused && (this.paused = false), i2) {
              for (const [, t3] of this.plugins)
                t3.play && t3.play();
              this.lastFrameTime = performance.now();
            }
            this.draw();
          } else
            this.firstStart = false;
        }
        pause() {
          if (this.drawAnimationFrame !== void 0 && ((vt() ? (t2) => clearTimeout(t2) : (t2) => (window.cancelAnimationFrame || window.webkitCancelRequestAnimationFrame || window.mozCancelRequestAnimationFrame || window.oCancelRequestAnimationFrame || window.msCancelRequestAnimationFrame || window.clearTimeout)(t2))(this.drawAnimationFrame), delete this.drawAnimationFrame), !this.paused) {
            for (const [, t2] of this.plugins)
              t2.pause && t2.pause();
            this.pageHidden || (this.paused = true);
          }
        }
        draw() {
          this.drawAnimationFrame = (vt() ? (t2) => setTimeout(t2) : (t2) => (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || window.setTimeout)(t2))((t2) => this.drawer.nextFrame(t2));
        }
        getAnimationStatus() {
          return !this.paused;
        }
        setNoise(t2, i2, e2) {
          this.setPath(t2, i2, e2);
        }
        setPath(t2, i2, e2) {
          t2 && (typeof t2 == "function" ? (this.pathGenerator.generate = t2, i2 && (this.pathGenerator.init = i2), e2 && (this.pathGenerator.update = e2)) : (t2.generate && (this.pathGenerator.generate = t2.generate), t2.init && (this.pathGenerator.init = t2.init), t2.update && (this.pathGenerator.update = t2.update)));
        }
        destroy() {
          this.stop(), this.canvas.destroy();
          for (const [, t2] of this.drawers)
            t2.destroy && t2.destroy(this);
          for (const t2 of this.drawers.keys())
            this.drawers.delete(t2);
          this.destroyed = true;
        }
        exportImg(t2) {
          this.exportImage(t2);
        }
        exportImage(t2, i2, e2) {
          var o2;
          return (o2 = this.canvas.element) === null || o2 === void 0 ? void 0 : o2.toBlob(t2, i2 != null ? i2 : "image/png", e2);
        }
        exportConfiguration() {
          return JSON.stringify(this.actualOptions, void 0, 2);
        }
        refresh() {
          return this.stop(), this.start();
        }
        reset() {
          return this._options = new xo(), this.refresh();
        }
        stop() {
          if (this.started) {
            this.firstStart = true, this.started = false, this.eventListeners.removeListeners(), this.pause(), this.particles.clear(), this.canvas.clear(), this.interactivity.element instanceof HTMLElement && this.intersectionObserver && this.intersectionObserver.observe(this.interactivity.element);
            for (const [, t2] of this.plugins)
              t2.stop && t2.stop();
            for (const t2 of this.plugins.keys())
              this.plugins.delete(t2);
            this.particles.linksColors = new Map(), delete this.particles.grabLineColor, delete this.particles.linksColor;
          }
        }
        loadTheme(t2) {
          return ko(this, void 0, void 0, function* () {
            this.currentTheme = t2, yield this.refresh();
          });
        }
        start() {
          return ko(this, void 0, void 0, function* () {
            if (!this.started) {
              yield this.init(), this.started = true, this.eventListeners.addListeners(), this.interactivity.element instanceof HTMLElement && this.intersectionObserver && this.intersectionObserver.observe(this.interactivity.element);
              for (const [, t2] of this.plugins)
                t2.startAsync !== void 0 ? yield t2.startAsync() : t2.start !== void 0 && t2.start();
              this.play();
            }
          });
        }
        addClickHandler(t2) {
          const i2 = this.interactivity.element;
          if (!i2)
            return;
          const e2 = (i3, e3) => {
            if (this.destroyed)
              return;
            const o3 = this.retina.pixelRatio, s4 = { x: e3.x * o3, y: e3.y * o3 }, n2 = this.particles.quadTree.queryCircle(s4, this.retina.sizeValue);
            t2(i3, n2);
          };
          let o2 = false, s3 = false;
          i2.addEventListener("click", (t3) => {
            if (this.destroyed)
              return;
            const i3 = t3, o3 = { x: i3.offsetX || i3.clientX, y: i3.offsetY || i3.clientY };
            e2(t3, o3);
          }), i2.addEventListener("touchstart", () => {
            this.destroyed || (o2 = true, s3 = false);
          }), i2.addEventListener("touchmove", () => {
            this.destroyed || (s3 = true);
          }), i2.addEventListener("touchend", (t3) => {
            var i3, n2, a2;
            if (!this.destroyed) {
              if (o2 && !s3) {
                const o3 = t3, s4 = o3.touches[o3.touches.length - 1], r2 = (i3 = this.canvas.element) === null || i3 === void 0 ? void 0 : i3.getBoundingClientRect(), l2 = { x: s4.clientX - ((n2 = r2 == null ? void 0 : r2.left) !== null && n2 !== void 0 ? n2 : 0), y: s4.clientY - ((a2 = r2 == null ? void 0 : r2.top) !== null && a2 !== void 0 ? a2 : 0) };
                e2(t3, l2);
              }
              o2 = false, s3 = false;
            }
          }), i2.addEventListener("touchcancel", () => {
            this.destroyed || (o2 = false, s3 = false);
          });
        }
        init() {
          return ko(this, void 0, void 0, function* () {
            this.actualOptions = new xo(), this.actualOptions.load(this._options), this.retina.init(), this.canvas.init(), this.actualOptions.setResponsive(this.canvas.size.width, this.retina.pixelRatio, this._options), this.actualOptions.setTheme(this.currentTheme), this.canvas.initBackground(), this.canvas.resize(), this.fpsLimit = this.actualOptions.fpsLimit > 0 ? this.actualOptions.fpsLimit : 60;
            const t2 = si.getAvailablePlugins(this);
            for (const [i2, e2] of t2)
              this.plugins.set(i2, e2);
            for (const [, t3] of this.drawers)
              t3.init && (yield t3.init(this));
            for (const [, t3] of this.plugins)
              t3.init ? t3.init(this.actualOptions) : t3.initAsync !== void 0 && (yield t3.initAsync(this.actualOptions));
            this.particles.init(), this.particles.setDensity();
            for (const [, t3] of this.plugins)
              t3.particlesSetup !== void 0 && t3.particlesSetup();
          });
        }
        intersectionManager(t2) {
          if (this.actualOptions.pauseOnOutsideViewport)
            for (const i2 of t2)
              i2.target === this.interactivity.element && (i2.isIntersecting ? this.play() : this.pause());
        }
      }
      var zo = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      };
      const Mo = [];
      function Co(t2) {
        console.error(`Error tsParticles - fetch status: ${t2}`), console.error("Error tsParticles - File config not found");
      }
      class Oo {
        static dom() {
          return Mo;
        }
        static domItem(t2) {
          const i2 = Oo.dom(), e2 = i2[t2];
          if (e2 && !e2.destroyed)
            return e2;
          i2.splice(t2, 1);
        }
        static load(t2, i2, e2) {
          return zo(this, void 0, void 0, function* () {
            let o2 = document.getElementById(t2);
            return o2 || (o2 = document.createElement("div"), o2.id = t2, document.append(o2)), Oo.set(t2, o2, i2, e2);
          });
        }
        static set(t2, i2, e2, o2) {
          return zo(this, void 0, void 0, function* () {
            const s3 = e2 instanceof Array ? yt(e2, o2) : e2, n2 = Oo.dom(), a2 = n2.findIndex((i3) => i3.id === t2);
            if (a2 >= 0) {
              const t3 = Oo.domItem(a2);
              t3 && !t3.destroyed && (t3.destroy(), n2.splice(a2, 1));
            }
            let r2, l2;
            if (i2.tagName.toLowerCase() === "canvas")
              r2 = i2, l2 = false;
            else {
              const t3 = i2.getElementsByTagName("canvas");
              t3.length ? (r2 = t3[0], r2.className || (r2.className = St.canvasClass), l2 = false) : (l2 = true, r2 = document.createElement("canvas"), r2.className = St.canvasClass, r2.style.width = "100%", r2.style.height = "100%", i2.appendChild(r2));
            }
            const c2 = new Po(t2, s3);
            return a2 >= 0 ? n2.splice(a2, 0, c2) : n2.push(c2), c2.canvas.loadCanvas(r2, l2), yield c2.start(), c2;
          });
        }
        static loadJSON(t2, i2, e2) {
          return zo(this, void 0, void 0, function* () {
            const o2 = i2 instanceof Array ? yt(i2, e2) : i2, s3 = yield fetch(o2);
            if (s3.ok)
              return Oo.load(t2, yield s3.json());
            Co(s3.status);
          });
        }
        static setJSON(t2, i2, e2, o2) {
          return zo(this, void 0, void 0, function* () {
            const s3 = e2 instanceof Array ? yt(e2, o2) : e2, n2 = yield fetch(s3);
            if (n2.ok) {
              const e3 = yield n2.json();
              return Oo.set(t2, i2, e3);
            }
            Co(n2.status);
          });
        }
        static setOnClickHandler(t2) {
          const i2 = Oo.dom();
          if (i2.length === 0)
            throw new Error("Can only set click handlers after calling tsParticles.load() or tsParticles.loadJSON()");
          for (const e2 of i2)
            e2.addClickHandler(t2);
        }
      }
      var So, Ao, Eo, Ro, To, Io = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      }, Do = function(t2, i2, e2, o2, s3) {
        if (o2 === "m")
          throw new TypeError("Private method is not writable");
        if (o2 === "a" && !s3)
          throw new TypeError("Private accessor was defined without a setter");
        if (typeof i2 == "function" ? t2 !== i2 || !s3 : !i2.has(t2))
          throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return o2 === "a" ? s3.call(t2, e2) : s3 ? s3.value = e2 : i2.set(t2, e2), e2;
      }, _o = function(t2, i2, e2, o2) {
        if (e2 === "a" && !o2)
          throw new TypeError("Private accessor was defined without a getter");
        if (typeof i2 == "function" ? t2 !== i2 || !o2 : !i2.has(t2))
          throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return e2 === "m" ? o2 : e2 === "a" ? o2.call(t2) : o2 ? o2.value : i2.get(t2);
      };
      So = new WeakMap();
      class Lo {
        constructor(t2) {
          this.container = t2;
        }
        startInfection(t2, i2) {
          i2 > this.container.actualOptions.infection.stages.length || i2 < 0 || (t2.infection.delay = 0, t2.infection.delayStage = i2);
        }
        updateInfectionStage(t2, i2) {
          i2 > this.container.actualOptions.infection.stages.length || i2 < 0 || t2.infection.stage !== void 0 && t2.infection.stage > i2 || (t2.infection.stage = i2, t2.infection.time = 0);
        }
        updateInfection(t2, i2) {
          const e2 = this.container.actualOptions, o2 = e2.infection, s3 = e2.infection.stages, n2 = s3.length;
          if (t2.infection.delay !== void 0 && t2.infection.delayStage !== void 0) {
            const e3 = t2.infection.delayStage;
            if (e3 > n2 || e3 < 0)
              return;
            t2.infection.delay >= 1e3 * o2.delay ? (t2.infection.stage = e3, t2.infection.time = 0, delete t2.infection.delay, delete t2.infection.delayStage) : t2.infection.delay += i2;
          } else
            delete t2.infection.delay, delete t2.infection.delayStage;
          if (t2.infection.stage !== void 0 && t2.infection.time !== void 0) {
            const e3 = s3[t2.infection.stage];
            e3.duration !== void 0 && e3.duration >= 0 && t2.infection.time > 1e3 * e3.duration ? this.nextInfectionStage(t2) : t2.infection.time += i2;
          } else
            delete t2.infection.stage, delete t2.infection.time;
        }
        nextInfectionStage(t2) {
          const i2 = this.container.actualOptions, e2 = i2.infection.stages.length;
          if (!(e2 <= 0 || t2.infection.stage === void 0) && (t2.infection.time = 0, e2 <= ++t2.infection.stage)) {
            if (i2.infection.cure)
              return delete t2.infection.stage, void delete t2.infection.time;
            t2.infection.stage = 0, t2.infection.time = 0;
          }
        }
      }
      class qo {
        constructor(t2) {
          this.container = t2, this.container.infecter = new Lo(this.container);
        }
        particlesSetup() {
          var t2;
          const i2 = this.container.actualOptions;
          for (let e2 = 0; e2 < i2.infection.infections; e2++) {
            const i3 = yt(this.container.particles.array.filter((t3) => {
              const i4 = t3;
              return i4.infection || (i4.infection = {}), i4.infection.stage === void 0;
            }));
            (t2 = this.container.infecter) === null || t2 === void 0 || t2.startInfection(i3, 0);
          }
        }
        particleFillColor(t2) {
          const i2 = t2, e2 = this.container.actualOptions;
          if (!i2.infection)
            return;
          const o2 = i2.infection.stage, s3 = e2.infection.stages;
          return o2 !== void 0 ? s3[o2].color : void 0;
        }
        particleStrokeColor(t2) {
          return this.particleFillColor(t2);
        }
      }
      class Fo extends Se {
        constructor(t2) {
          super(t2);
        }
        isEnabled() {
          var t2, i2;
          const e2 = this.container.actualOptions;
          return (i2 = (t2 = e2 == null ? void 0 : e2.infection) === null || t2 === void 0 ? void 0 : t2.enable) !== null && i2 !== void 0 && i2;
        }
        reset() {
        }
        interact(t2, i2) {
          var e2, o2;
          const s3 = this.container.infecter;
          if (!s3)
            return;
          if (s3.updateInfection(t2, i2.value), t2.infection.stage === void 0)
            return;
          const n2 = this.container, a2 = n2.actualOptions.infection;
          if (!a2.enable || a2.stages.length < 1)
            return;
          const r2 = a2.stages[t2.infection.stage], l2 = n2.retina.pixelRatio, c2 = 2 * t2.getRadius() + r2.radius * l2, d2 = t2.getPosition(), h2 = (e2 = r2.infectedStage) !== null && e2 !== void 0 ? e2 : t2.infection.stage, u2 = n2.particles.quadTree.queryCircle(d2, c2), v2 = r2.rate, p2 = u2.length;
          for (const i3 of u2) {
            const e3 = i3;
            if (!(e3 === t2 || e3.destroyed || e3.spawning || e3.infection.stage !== void 0 && e3.infection.stage === t2.infection.stage) && Math.random() < v2 / p2) {
              if (e3.infection.stage === void 0)
                s3.startInfection(e3, h2);
              else if (e3.infection.stage < t2.infection.stage)
                s3.updateInfectionStage(e3, h2);
              else if (e3.infection.stage > t2.infection.stage) {
                const i4 = a2.stages[e3.infection.stage], n3 = (o2 = i4 == null ? void 0 : i4.infectedStage) !== null && o2 !== void 0 ? o2 : e3.infection.stage;
                s3.updateInfectionStage(t2, n3);
              }
            }
          }
        }
      }
      class Ho {
        constructor() {
          this.color = new wi(), this.color.value = "#ff0000", this.radius = 0, this.rate = 1;
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), this.duration = t2.duration, this.infectedStage = t2.infectedStage, t2.radius !== void 0 && (this.radius = t2.radius), t2.rate !== void 0 && (this.rate = t2.rate));
        }
      }
      class Vo {
        constructor() {
          this.cure = false, this.delay = 0, this.enable = false, this.infections = 0, this.stages = [];
        }
        load(t2) {
          t2 !== void 0 && (t2.cure !== void 0 && (this.cure = t2.cure), t2.delay !== void 0 && (this.delay = t2.delay), t2.enable !== void 0 && (this.enable = t2.enable), t2.infections !== void 0 && (this.infections = t2.infections), t2.stages !== void 0 && (this.stages = t2.stages.map((t3) => {
            const i2 = new Ho();
            return i2.load(t3), i2;
          })));
        }
      }
      class $o {
        constructor() {
          this.id = "infection";
        }
        getPlugin(t2) {
          return new qo(t2);
        }
        needsPlugin(t2) {
          var i2, e2;
          return (e2 = (i2 = t2 == null ? void 0 : t2.infection) === null || i2 === void 0 ? void 0 : i2.enable) !== null && e2 !== void 0 && e2;
        }
        loadOptions(t2, i2) {
          if (!this.needsPlugin(i2))
            return;
          const e2 = t2;
          let o2 = e2.infection;
          (o2 == null ? void 0 : o2.load) === void 0 && (e2.infection = o2 = new Vo()), o2.load(i2 == null ? void 0 : i2.infection);
        }
      }
      class Bo {
        constructor() {
          this.mode = V.percent, this.height = 0, this.width = 0;
        }
        load(t2) {
          t2 !== void 0 && (t2.mode !== void 0 && (this.mode = t2.mode), t2.height !== void 0 && (this.height = t2.height), t2.width !== void 0 && (this.width = t2.width));
        }
      }
      function Wo(t2, i2) {
        return t2 + i2 * (Math.random() - 0.5);
      }
      function No(t2, i2) {
        return { x: Wo(t2.x, i2.x), y: Wo(t2.y, i2.y) };
      }
      class Go {
        constructor(t2, i2, e2, o2) {
          var s3, n2, a2, r2, l2, c2, d2;
          this.emitters = t2, this.container = i2, this.firstSpawn = true, this.currentDuration = 0, this.currentEmitDelay = 0, this.currentSpawnDelay = 0, this.initialPosition = o2, this.emitterOptions = wt({}, e2), this.spawnDelay = 1e3 * ((s3 = this.emitterOptions.life.delay) !== null && s3 !== void 0 ? s3 : 0) / this.container.retina.reduceFactor, this.position = (n2 = this.initialPosition) !== null && n2 !== void 0 ? n2 : this.calcPosition(), this.name = e2.name;
          let h2 = wt({}, this.emitterOptions.particles);
          h2 != null || (h2 = {}), (a2 = h2.move) !== null && a2 !== void 0 || (h2.move = {}), (r2 = (d2 = h2.move).direction) !== null && r2 !== void 0 || (d2.direction = this.emitterOptions.direction), this.emitterOptions.spawnColor !== void 0 && (this.spawnColor = Tt(this.emitterOptions.spawnColor)), this.paused = !this.emitterOptions.autoPlay, this.particlesOptions = h2, this.size = (l2 = this.emitterOptions.size) !== null && l2 !== void 0 ? l2 : (() => {
            const t3 = new Bo();
            return t3.load({ height: 0, mode: V.percent, width: 0 }), t3;
          })(), this.lifeCount = (c2 = this.emitterOptions.life.count) !== null && c2 !== void 0 ? c2 : -1, this.immortal = this.lifeCount <= 0, this.play();
        }
        externalPlay() {
          this.paused = false, this.play();
        }
        externalPause() {
          this.paused = true, this.pause();
        }
        play() {
          if (!this.paused && this.container.retina.reduceFactor && (this.lifeCount > 0 || this.immortal || !this.emitterOptions.life.count)) {
            if (this.emitDelay === void 0) {
              const t2 = it(this.emitterOptions.rate.delay);
              this.emitDelay = 1e3 * t2 / this.container.retina.reduceFactor;
            }
            (this.lifeCount > 0 || this.immortal) && this.prepareToDie();
          }
        }
        pause() {
          this.paused || delete this.emitDelay;
        }
        resize() {
          const t2 = this.initialPosition;
          this.position = t2 && mt(t2, this.container.canvas.size) ? t2 : this.calcPosition();
        }
        update(t2) {
          var i2, e2, o2;
          this.paused || (this.firstSpawn && (this.firstSpawn = false, this.currentSpawnDelay = (i2 = this.spawnDelay) !== null && i2 !== void 0 ? i2 : 0, this.currentEmitDelay = (e2 = this.emitDelay) !== null && e2 !== void 0 ? e2 : 0, t2.value = 0), this.duration !== void 0 && (this.currentDuration += t2.value, this.currentDuration >= this.duration && (this.pause(), this.spawnDelay !== void 0 && delete this.spawnDelay, this.immortal || this.lifeCount--, this.lifeCount > 0 || this.immortal ? (this.position = this.calcPosition(), this.spawnDelay = 1e3 * ((o2 = this.emitterOptions.life.delay) !== null && o2 !== void 0 ? o2 : 0) / this.container.retina.reduceFactor) : this.destroy(), this.currentDuration -= this.duration, delete this.duration)), this.spawnDelay !== void 0 && (this.currentSpawnDelay += t2.value, this.currentSpawnDelay >= this.spawnDelay && (this.play(), this.currentSpawnDelay -= this.currentSpawnDelay, delete this.spawnDelay)), this.emitDelay !== void 0 && (this.currentEmitDelay += t2.value, this.currentEmitDelay >= this.emitDelay && (this.emit(), this.currentEmitDelay -= this.emitDelay)));
        }
        prepareToDie() {
          var t2;
          if (this.paused)
            return;
          const i2 = (t2 = this.emitterOptions.life) === null || t2 === void 0 ? void 0 : t2.duration;
          this.container.retina.reduceFactor && (this.lifeCount > 0 || this.immortal) && i2 !== void 0 && i2 > 0 && (this.duration = 1e3 * i2);
        }
        destroy() {
          this.emitters.removeEmitter(this);
        }
        calcPosition() {
          var t2, i2;
          const e2 = this.container, o2 = this.emitterOptions.position;
          return { x: ((t2 = o2 == null ? void 0 : o2.x) !== null && t2 !== void 0 ? t2 : 100 * Math.random()) / 100 * e2.canvas.size.width, y: ((i2 = o2 == null ? void 0 : o2.y) !== null && i2 !== void 0 ? i2 : 100 * Math.random()) / 100 * e2.canvas.size.height };
        }
        emit() {
          var t2;
          if (this.paused)
            return;
          const i2 = this.container, e2 = this.position, o2 = { x: this.size.mode === V.percent ? i2.canvas.size.width * this.size.width / 100 : this.size.width, y: this.size.mode === V.percent ? i2.canvas.size.height * this.size.height / 100 : this.size.height }, s3 = it(this.emitterOptions.rate.quantity);
          for (let n2 = 0; n2 < s3; n2++) {
            const s4 = wt({}, this.particlesOptions);
            if (this.spawnColor !== void 0) {
              const i3 = (t2 = this.emitterOptions.spawnColor) === null || t2 === void 0 ? void 0 : t2.animation;
              if (i3) {
                const t3 = i3;
                if (t3.enable)
                  this.spawnColor.h = this.setColorAnimation(t3, this.spawnColor.h, 360);
                else {
                  const t4 = i3;
                  this.spawnColor.h = this.setColorAnimation(t4.h, this.spawnColor.h, 360), this.spawnColor.s = this.setColorAnimation(t4.s, this.spawnColor.s, 100), this.spawnColor.l = this.setColorAnimation(t4.l, this.spawnColor.l, 100);
                }
              }
              s4.color ? s4.color.value = this.spawnColor : s4.color = { value: this.spawnColor };
            }
            i2.particles.addParticle(No(e2, o2), s4);
          }
        }
        setColorAnimation(t2, i2, e2) {
          var o2;
          const s3 = this.container;
          if (!t2.enable)
            return i2;
          const n2 = tt(t2.offset), a2 = 1e3 * it(this.emitterOptions.rate.delay) / s3.retina.reduceFactor;
          return (i2 + ((o2 = t2.speed) !== null && o2 !== void 0 ? o2 : 0) * s3.fpsLimit / a2 + 3.6 * n2) % e2;
        }
      }
      class Uo {
        constructor() {
          this.quantity = 1, this.delay = 0.1;
        }
        load(t2) {
          t2 !== void 0 && (t2.quantity !== void 0 && (this.quantity = st(t2.quantity)), t2.delay !== void 0 && (this.delay = st(t2.delay)));
        }
      }
      class jo {
        load(t2) {
          t2 !== void 0 && (t2.count !== void 0 && (this.count = t2.count), t2.delay !== void 0 && (this.delay = t2.delay), t2.duration !== void 0 && (this.duration = t2.duration));
        }
      }
      class Yo {
        constructor() {
          this.autoPlay = true, this.life = new jo(), this.rate = new Uo();
        }
        load(t2) {
          t2 !== void 0 && (t2.autoPlay !== void 0 && (this.autoPlay = t2.autoPlay), t2.size !== void 0 && (this.size === void 0 && (this.size = new Bo()), this.size.load(t2.size)), t2.direction !== void 0 && (this.direction = t2.direction), this.life.load(t2.life), this.name = t2.name, t2.particles !== void 0 && (this.particles = wt({}, t2.particles)), this.rate.load(t2.rate), t2.position !== void 0 && (this.position = { x: t2.position.x, y: t2.position.y }), t2.spawnColor !== void 0 && (this.spawnColor === void 0 && (this.spawnColor = new ji()), this.spawnColor.load(t2.spawnColor)));
        }
      }
      !function(t2) {
        t2.emitter = "emitter";
      }(Ao || (Ao = {}));
      class Xo {
        constructor(t2) {
          this.container = t2, this.array = [], this.emitters = [], this.interactivityEmitters = [];
          const i2 = t2;
          i2.getEmitter = (t3) => t3 === void 0 || typeof t3 == "number" ? this.array[t3 || 0] : this.array.find((i3) => i3.name === t3), i2.addEmitter = (t3, i3) => this.addEmitter(t3, i3), i2.playEmitter = (t3) => {
            const e2 = i2.getEmitter(t3);
            e2 && e2.externalPlay();
          }, i2.pauseEmitter = (t3) => {
            const e2 = i2.getEmitter(t3);
            e2 && e2.externalPause();
          };
        }
        init(t2) {
          var i2, e2;
          if (!t2)
            return;
          t2.emitters && (t2.emitters instanceof Array ? this.emitters = t2.emitters.map((t3) => {
            const i3 = new Yo();
            return i3.load(t3), i3;
          }) : (this.emitters instanceof Array && (this.emitters = new Yo()), this.emitters.load(t2.emitters)));
          const o2 = (e2 = (i2 = t2.interactivity) === null || i2 === void 0 ? void 0 : i2.modes) === null || e2 === void 0 ? void 0 : e2.emitters;
          if (o2 && (o2 instanceof Array ? this.interactivityEmitters = o2.map((t3) => {
            const i3 = new Yo();
            return i3.load(t3), i3;
          }) : (this.interactivityEmitters instanceof Array && (this.interactivityEmitters = new Yo()), this.interactivityEmitters.load(o2))), this.emitters instanceof Array)
            for (const t3 of this.emitters)
              this.addEmitter(t3);
          else
            this.addEmitter(this.emitters);
        }
        play() {
          for (const t2 of this.array)
            t2.play();
        }
        pause() {
          for (const t2 of this.array)
            t2.pause();
        }
        stop() {
          this.array = [];
        }
        update(t2) {
          for (const i2 of this.array)
            i2.update(t2);
        }
        handleClickMode(t2) {
          const i2 = this.container, e2 = this.emitters, o2 = this.interactivityEmitters;
          if (t2 === Ao.emitter) {
            let t3;
            o2 instanceof Array ? o2.length > 0 && (t3 = yt(o2)) : t3 = o2;
            const s3 = t3 != null ? t3 : e2 instanceof Array ? yt(e2) : e2, n2 = i2.interactivity.mouse.clickPosition;
            this.addEmitter(wt({}, s3), n2);
          }
        }
        resize() {
          for (const t2 of this.array)
            t2.resize();
        }
        addEmitter(t2, i2) {
          const e2 = new Go(this, this.container, t2, i2);
          return this.array.push(e2), e2;
        }
        removeEmitter(t2) {
          const i2 = this.array.indexOf(t2);
          i2 >= 0 && this.array.splice(i2, 1);
        }
      }
      class Qo {
        constructor() {
          this.id = "emitters";
        }
        getPlugin(t2) {
          return new Xo(t2);
        }
        needsPlugin(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return false;
          const s3 = t2.emitters;
          return s3 instanceof Array && !!s3.length || s3 !== void 0 || !!((o2 = (e2 = (i2 = t2.interactivity) === null || i2 === void 0 ? void 0 : i2.events) === null || e2 === void 0 ? void 0 : e2.onClick) === null || o2 === void 0 ? void 0 : o2.mode) && pt(Ao.emitter, t2.interactivity.events.onClick.mode);
        }
        loadOptions(t2, i2) {
          var e2, o2;
          if (!this.needsPlugin(t2) && !this.needsPlugin(i2))
            return;
          const s3 = t2;
          if (i2 == null ? void 0 : i2.emitters)
            if ((i2 == null ? void 0 : i2.emitters) instanceof Array)
              s3.emitters = i2 == null ? void 0 : i2.emitters.map((t3) => {
                const i3 = new Yo();
                return i3.load(t3), i3;
              });
            else {
              let t3 = s3.emitters;
              (t3 == null ? void 0 : t3.load) === void 0 && (s3.emitters = t3 = new Yo()), t3.load(i2 == null ? void 0 : i2.emitters);
            }
          const n2 = (o2 = (e2 = i2 == null ? void 0 : i2.interactivity) === null || e2 === void 0 ? void 0 : e2.modes) === null || o2 === void 0 ? void 0 : o2.emitters;
          if (n2)
            if (n2 instanceof Array)
              s3.interactivity.modes.emitters = n2.map((t3) => {
                const i3 = new Yo();
                return i3.load(t3), i3;
              });
            else {
              let t3 = s3.interactivity.modes.emitters;
              (t3 == null ? void 0 : t3.load) === void 0 && (s3.interactivity.modes.emitters = t3 = new Yo()), t3.load(n2);
            }
        }
      }
      !function(t2) {
        t2.equidistant = "equidistant", t2.onePerPoint = "one-per-point", t2.perPoint = "per-point", t2.randomLength = "random-length", t2.randomPoint = "random-point";
      }(Eo || (Eo = {})), function(t2) {
        t2.path = "path", t2.radius = "radius";
      }(Ro || (Ro = {})), function(t2) {
        t2.inline = "inline", t2.inside = "inside", t2.outside = "outside", t2.none = "none";
      }(To || (To = {}));
      class Jo {
        constructor() {
          this.color = new wi(), this.width = 0.5, this.opacity = 1;
        }
        load(t2) {
          var i2;
          t2 !== void 0 && (this.color = wi.create(this.color, t2.color), typeof this.color.value == "string" && (this.opacity = (i2 = function(t3) {
            var i3;
            return (i3 = Et(t3)) === null || i3 === void 0 ? void 0 : i3.a;
          }(this.color.value)) !== null && i2 !== void 0 ? i2 : this.opacity), t2.opacity !== void 0 && (this.opacity = t2.opacity), t2.width !== void 0 && (this.width = t2.width));
        }
      }
      class Zo {
        constructor() {
          this.enable = false, this.stroke = new Jo();
        }
        get lineWidth() {
          return this.stroke.width;
        }
        set lineWidth(t2) {
          this.stroke.width = t2;
        }
        get lineColor() {
          return this.stroke.color;
        }
        set lineColor(t2) {
          this.stroke.color = wi.create(this.stroke.color, t2);
        }
        load(t2) {
          var i2;
          if (t2 !== void 0) {
            t2.enable !== void 0 && (this.enable = t2.enable);
            const e2 = (i2 = t2.stroke) !== null && i2 !== void 0 ? i2 : { color: t2.lineColor, width: t2.lineWidth };
            this.stroke.load(e2);
          }
        }
      }
      class Ko {
        constructor() {
          this.radius = 10, this.type = Ro.path;
        }
        load(t2) {
          t2 !== void 0 && (t2.radius !== void 0 && (this.radius = t2.radius), t2.type !== void 0 && (this.type = t2.type));
        }
      }
      class ts {
        constructor() {
          this.arrangement = Eo.onePerPoint;
        }
        load(t2) {
          t2 !== void 0 && t2.arrangement !== void 0 && (this.arrangement = t2.arrangement);
        }
      }
      class is {
        constructor() {
          this.path = [], this.size = { height: 0, width: 0 };
        }
        load(t2) {
          t2 !== void 0 && (t2.path !== void 0 && (this.path = t2.path), t2.size !== void 0 && (t2.size.width !== void 0 && (this.size.width = t2.size.width), t2.size.height !== void 0 && (this.size.height = t2.size.height)));
        }
      }
      class es {
        constructor() {
          this.draw = new Zo(), this.enable = false, this.inline = new ts(), this.move = new Ko(), this.scale = 1, this.type = To.none;
        }
        get inlineArrangement() {
          return this.inline.arrangement;
        }
        set inlineArrangement(t2) {
          this.inline.arrangement = t2;
        }
        load(t2) {
          var i2;
          if (t2 !== void 0) {
            this.draw.load(t2.draw);
            const e2 = (i2 = t2.inline) !== null && i2 !== void 0 ? i2 : { arrangement: t2.inlineArrangement };
            e2 !== void 0 && this.inline.load(e2), this.move.load(t2.move), t2.scale !== void 0 && (this.scale = t2.scale), t2.type !== void 0 && (this.type = t2.type), t2.enable !== void 0 ? this.enable = t2.enable : this.enable = this.type !== To.none, t2.url !== void 0 && (this.url = t2.url), t2.data !== void 0 && (typeof t2.data == "string" ? this.data = t2.data : (this.data = new is(), this.data.load(t2.data))), t2.position !== void 0 && (this.position = wt({}, t2.position));
          }
        }
      }
      var os, ss = function(t2, i2, e2, o2) {
        return new (e2 || (e2 = Promise))(function(s3, n2) {
          function a2(t3) {
            try {
              l2(o2.next(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function r2(t3) {
            try {
              l2(o2.throw(t3));
            } catch (t4) {
              n2(t4);
            }
          }
          function l2(t3) {
            var i3;
            t3.done ? s3(t3.value) : (i3 = t3.value, i3 instanceof e2 ? i3 : new e2(function(t4) {
              t4(i3);
            })).then(a2, r2);
          }
          l2((o2 = o2.apply(t2, i2 || [])).next());
        });
      };
      function ns(t2, i2, e2) {
        const o2 = Rt(e2.color);
        if (o2) {
          t2.beginPath(), t2.moveTo(i2[0].x, i2[0].y);
          for (const e3 of i2)
            t2.lineTo(e3.x, e3.y);
          t2.closePath(), t2.strokeStyle = Lt(o2), t2.lineWidth = e2.width, t2.stroke();
        }
      }
      function as(t2, i2, e2, o2) {
        t2.translate(o2.x, o2.y);
        const s3 = Rt(e2.color);
        s3 && (t2.strokeStyle = Lt(s3, e2.opacity), t2.lineWidth = e2.width, t2.stroke(i2));
      }
      function rs(t2, i2, e2) {
        const { dx: o2, dy: s3 } = at(e2, t2), { dx: n2, dy: a2 } = at(i2, t2), r2 = (o2 * n2 + s3 * a2) / (Math.pow(n2, 2) + Math.pow(a2, 2));
        let l2 = t2.x + n2 * r2, c2 = t2.y + a2 * r2;
        return r2 < 0 ? (l2 = t2.x, c2 = t2.y) : r2 > 1 && (l2 = i2.x, c2 = i2.y), { x: l2, y: c2, isOnSegment: r2 >= 0 && r2 <= 1 };
      }
      function ls(t2, i2, e2) {
        const { dx: o2, dy: s3 } = at(t2, i2), n2 = Math.atan2(s3, o2), a2 = Math.sin(n2), r2 = -Math.cos(n2), l2 = 2 * (e2.x * a2 + e2.y * r2);
        e2.x -= l2 * a2, e2.y -= l2 * r2;
      }
      class cs {
        constructor(t2) {
          this.container = t2, this.dimension = { height: 0, width: 0 }, this.path2DSupported = !!window.Path2D, this.options = new es(), this.polygonMaskMoveRadius = this.options.move.radius * t2.retina.pixelRatio;
        }
        initAsync(t2) {
          return ss(this, void 0, void 0, function* () {
            this.options.load(t2 == null ? void 0 : t2.polygon);
            const i2 = this.options;
            this.polygonMaskMoveRadius = i2.move.radius * this.container.retina.pixelRatio, i2.enable && (yield this.initRawData());
          });
        }
        resize() {
          const t2 = this.container, i2 = this.options;
          i2.enable && i2.type !== To.none && (this.redrawTimeout && clearTimeout(this.redrawTimeout), this.redrawTimeout = window.setTimeout(() => ss(this, void 0, void 0, function* () {
            yield this.initRawData(true), t2.particles.redraw();
          }), 250));
        }
        stop() {
          delete this.raw, delete this.paths;
        }
        particlesInitialization() {
          const t2 = this.options;
          return !(!t2.enable || t2.type !== To.inline || t2.inline.arrangement !== Eo.onePerPoint && t2.inline.arrangement !== Eo.perPoint) && (this.drawPoints(), true);
        }
        particlePosition(t2) {
          var i2, e2;
          if (this.options.enable && ((e2 = (i2 = this.raw) === null || i2 === void 0 ? void 0 : i2.length) !== null && e2 !== void 0 ? e2 : 0) > 0)
            return wt({}, t2 || this.randomPoint());
        }
        particleBounce(t2, i2, e2) {
          return this.polygonBounce(t2, i2, e2);
        }
        clickPositionValid(t2) {
          const i2 = this.options;
          return i2.enable && i2.type !== To.none && i2.type !== To.inline && this.checkInsidePolygon(t2);
        }
        draw(t2) {
          var i2;
          if (!((i2 = this.paths) === null || i2 === void 0 ? void 0 : i2.length))
            return;
          const e2 = this.options, o2 = e2.draw;
          if (!e2.enable || !o2.enable)
            return;
          const s3 = this.raw;
          for (const i3 of this.paths) {
            const e3 = i3.path2d, n2 = this.path2DSupported;
            t2 && (n2 && e3 && this.offset ? as(t2, e3, o2.stroke, this.offset) : s3 && ns(t2, s3, o2.stroke));
          }
        }
        polygonBounce(t2, i2, e2) {
          const o2 = this.options;
          if (!this.raw || !o2.enable || e2 !== T.top)
            return false;
          if (o2.type === To.inside || o2.type === To.outside) {
            let i3, e3, o3;
            const s3 = t2.getPosition(), n2 = t2.getRadius();
            for (let a2 = 0, r2 = this.raw.length - 1; a2 < this.raw.length; r2 = a2++) {
              const l2 = this.raw[a2], c2 = this.raw[r2];
              i3 = rs(l2, c2, s3);
              const d2 = at(s3, i3);
              if ([e3, o3] = [d2.dx, d2.dy], d2.distance < n2)
                return ls(l2, c2, t2.velocity), true;
            }
            if (i3 && e3 !== void 0 && o3 !== void 0 && !this.checkInsidePolygon(s3)) {
              const e4 = { x: 1, y: 1 };
              return t2.position.x >= i3.x && (e4.x = -1), t2.position.y >= i3.y && (e4.y = -1), t2.position.x = i3.x + 2 * n2 * e4.x, t2.position.y = i3.y + 2 * n2 * e4.y, t2.velocity.mult(-1), true;
            }
          } else if (o2.type === To.inline && t2.initialPosition) {
            if (rt(t2.initialPosition, t2.getPosition()) > this.polygonMaskMoveRadius)
              return t2.velocity.x = t2.velocity.y / 2 - t2.velocity.x, t2.velocity.y = t2.velocity.x / 2 - t2.velocity.y, true;
          }
          return false;
        }
        checkInsidePolygon(t2) {
          var i2, e2;
          const o2 = this.container, s3 = this.options;
          if (!s3.enable || s3.type === To.none || s3.type === To.inline)
            return true;
          if (!this.raw)
            throw new Error(St.noPolygonFound);
          const n2 = o2.canvas.size, a2 = (i2 = t2 == null ? void 0 : t2.x) !== null && i2 !== void 0 ? i2 : Math.random() * n2.width, r2 = (e2 = t2 == null ? void 0 : t2.y) !== null && e2 !== void 0 ? e2 : Math.random() * n2.height;
          let l2 = false;
          for (let t3 = 0, i3 = this.raw.length - 1; t3 < this.raw.length; i3 = t3++) {
            const e3 = this.raw[t3], o3 = this.raw[i3];
            e3.y > r2 != o3.y > r2 && a2 < (o3.x - e3.x) * (r2 - e3.y) / (o3.y - e3.y) + e3.x && (l2 = !l2);
          }
          return s3.type === To.inside ? l2 : s3.type === To.outside && !l2;
        }
        parseSvgPath(t2, i2) {
          var e2, o2, s3;
          const n2 = i2 != null && i2;
          if (this.paths !== void 0 && !n2)
            return this.raw;
          const a2 = this.container, r2 = this.options, l2 = new DOMParser().parseFromString(t2, "image/svg+xml"), c2 = l2.getElementsByTagName("svg")[0];
          let d2 = c2.getElementsByTagName("path");
          d2.length || (d2 = l2.getElementsByTagName("path")), this.paths = [];
          for (let t3 = 0; t3 < d2.length; t3++) {
            const i3 = d2.item(t3);
            i3 && this.paths.push({ element: i3, length: i3.getTotalLength() });
          }
          const h2 = a2.retina.pixelRatio, u2 = r2.scale / h2;
          this.dimension.width = parseFloat((e2 = c2.getAttribute("width")) !== null && e2 !== void 0 ? e2 : "0") * u2, this.dimension.height = parseFloat((o2 = c2.getAttribute("height")) !== null && o2 !== void 0 ? o2 : "0") * u2;
          const v2 = (s3 = r2.position) !== null && s3 !== void 0 ? s3 : { x: 50, y: 50 };
          return this.offset = { x: a2.canvas.size.width * v2.x / (100 * h2) - this.dimension.width / 2, y: a2.canvas.size.height * v2.y / (100 * h2) - this.dimension.height / 2 }, function(t3, i3, e3) {
            const o3 = [];
            for (const s4 of t3) {
              const t4 = s4.element.pathSegList, n3 = t4.numberOfItems, a3 = { x: 0, y: 0 };
              for (let s5 = 0; s5 < n3; s5++) {
                const n4 = t4.getItem(s5), r3 = window.SVGPathSeg;
                switch (n4.pathSegType) {
                  case r3.PATHSEG_MOVETO_ABS:
                  case r3.PATHSEG_LINETO_ABS:
                  case r3.PATHSEG_CURVETO_CUBIC_ABS:
                  case r3.PATHSEG_CURVETO_QUADRATIC_ABS:
                  case r3.PATHSEG_ARC_ABS:
                  case r3.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:
                  case r3.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: {
                    const t5 = n4;
                    a3.x = t5.x, a3.y = t5.y;
                    break;
                  }
                  case r3.PATHSEG_LINETO_HORIZONTAL_ABS:
                    a3.x = n4.x;
                    break;
                  case r3.PATHSEG_LINETO_VERTICAL_ABS:
                    a3.y = n4.y;
                    break;
                  case r3.PATHSEG_LINETO_REL:
                  case r3.PATHSEG_MOVETO_REL:
                  case r3.PATHSEG_CURVETO_CUBIC_REL:
                  case r3.PATHSEG_CURVETO_QUADRATIC_REL:
                  case r3.PATHSEG_ARC_REL:
                  case r3.PATHSEG_CURVETO_CUBIC_SMOOTH_REL:
                  case r3.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL: {
                    const t5 = n4;
                    a3.x += t5.x, a3.y += t5.y;
                    break;
                  }
                  case r3.PATHSEG_LINETO_HORIZONTAL_REL:
                    a3.x += n4.x;
                    break;
                  case r3.PATHSEG_LINETO_VERTICAL_REL:
                    a3.y += n4.y;
                    break;
                  case r3.PATHSEG_UNKNOWN:
                  case r3.PATHSEG_CLOSEPATH:
                    continue;
                }
                o3.push({ x: a3.x * i3 + e3.x, y: a3.y * i3 + e3.y });
              }
            }
            return o3;
          }(this.paths, u2, this.offset);
        }
        downloadSvgPath(t2, i2) {
          return ss(this, void 0, void 0, function* () {
            const e2 = this.options, o2 = t2 || e2.url, s3 = i2 != null && i2;
            if (!o2 || this.paths !== void 0 && !s3)
              return this.raw;
            const n2 = yield fetch(o2);
            if (!n2.ok)
              throw new Error("tsParticles Error - Error occurred during polygon mask download");
            return this.parseSvgPath(yield n2.text(), i2);
          });
        }
        drawPoints() {
          if (this.raw)
            for (const t2 of this.raw)
              this.container.particles.addParticle({ x: t2.x, y: t2.y });
        }
        randomPoint() {
          const t2 = this.container, i2 = this.options;
          let e2;
          if (i2.type === To.inline)
            switch (i2.inline.arrangement) {
              case Eo.randomPoint:
                e2 = this.getRandomPoint();
                break;
              case Eo.randomLength:
                e2 = this.getRandomPointByLength();
                break;
              case Eo.equidistant:
                e2 = this.getEquidistantPointByIndex(t2.particles.count);
                break;
              case Eo.onePerPoint:
              case Eo.perPoint:
              default:
                e2 = this.getPointByIndex(t2.particles.count);
            }
          else
            e2 = { x: Math.random() * t2.canvas.size.width, y: Math.random() * t2.canvas.size.height };
          return this.checkInsidePolygon(e2) ? e2 : this.randomPoint();
        }
        getRandomPoint() {
          if (!this.raw || !this.raw.length)
            throw new Error(St.noPolygonDataLoaded);
          const t2 = yt(this.raw);
          return { x: t2.x, y: t2.y };
        }
        getRandomPointByLength() {
          var t2, i2, e2;
          const o2 = this.options;
          if (!this.raw || !this.raw.length || !((t2 = this.paths) === null || t2 === void 0 ? void 0 : t2.length))
            throw new Error(St.noPolygonDataLoaded);
          const s3 = yt(this.paths), n2 = Math.floor(Math.random() * s3.length) + 1, a2 = s3.element.getPointAtLength(n2);
          return { x: a2.x * o2.scale + (((i2 = this.offset) === null || i2 === void 0 ? void 0 : i2.x) || 0), y: a2.y * o2.scale + (((e2 = this.offset) === null || e2 === void 0 ? void 0 : e2.y) || 0) };
        }
        getEquidistantPointByIndex(t2) {
          var i2, e2, o2, s3, n2, a2, r2;
          const l2 = this.container.actualOptions, c2 = this.options;
          if (!this.raw || !this.raw.length || !((i2 = this.paths) === null || i2 === void 0 ? void 0 : i2.length))
            throw new Error(St.noPolygonDataLoaded);
          let d2, h2 = 0;
          const u2 = this.paths.reduce((t3, i3) => t3 + i3.length, 0) / l2.particles.number.value;
          for (const i3 of this.paths) {
            const e3 = u2 * t2 - h2;
            if (e3 <= i3.length) {
              d2 = i3.element.getPointAtLength(e3);
              break;
            }
            h2 += i3.length;
          }
          return { x: ((e2 = d2 == null ? void 0 : d2.x) !== null && e2 !== void 0 ? e2 : 0) * c2.scale + ((s3 = (o2 = this.offset) === null || o2 === void 0 ? void 0 : o2.x) !== null && s3 !== void 0 ? s3 : 0), y: ((n2 = d2 == null ? void 0 : d2.y) !== null && n2 !== void 0 ? n2 : 0) * c2.scale + ((r2 = (a2 = this.offset) === null || a2 === void 0 ? void 0 : a2.y) !== null && r2 !== void 0 ? r2 : 0) };
        }
        getPointByIndex(t2) {
          if (!this.raw || !this.raw.length)
            throw new Error(St.noPolygonDataLoaded);
          const i2 = this.raw[t2 % this.raw.length];
          return { x: i2.x, y: i2.y };
        }
        createPath2D() {
          var t2, i2;
          const e2 = this.options;
          if (this.path2DSupported && ((t2 = this.paths) === null || t2 === void 0 ? void 0 : t2.length))
            for (const t3 of this.paths) {
              const o2 = (i2 = t3.element) === null || i2 === void 0 ? void 0 : i2.getAttribute("d");
              if (o2) {
                const i3 = new Path2D(o2), s3 = document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix(), n2 = new Path2D(), a2 = s3.scale(e2.scale);
                n2.addPath ? (n2.addPath(i3, a2), t3.path2d = n2) : delete t3.path2d;
              } else
                delete t3.path2d;
              !t3.path2d && this.raw && (t3.path2d = new Path2D(), t3.path2d.moveTo(this.raw[0].x, this.raw[0].y), this.raw.forEach((i3, e3) => {
                var o3;
                e3 > 0 && ((o3 = t3.path2d) === null || o3 === void 0 || o3.lineTo(i3.x, i3.y));
              }), t3.path2d.closePath());
            }
        }
        initRawData(t2) {
          return ss(this, void 0, void 0, function* () {
            const i2 = this.options;
            if (i2.url)
              this.raw = yield this.downloadSvgPath(i2.url, t2);
            else if (i2.data) {
              const e2 = i2.data;
              let o2;
              if (typeof e2 != "string") {
                const t3 = e2.path instanceof Array ? e2.path.map((t4) => `<path d="${t4}" />`).join("") : `<path d="${e2.path}" />`;
                o2 = `<svg ${'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'} width="${e2.size.width}" height="${e2.size.height}">${t3}</svg>`;
              } else
                o2 = e2;
              this.raw = this.parseSvgPath(o2, t2);
            }
            this.createPath2D();
          });
        }
      }
      class ds {
        constructor() {
          this.id = "polygonMask";
        }
        getPlugin(t2) {
          return new cs(t2);
        }
        needsPlugin(t2) {
          var i2, e2, o2;
          return (e2 = (i2 = t2 == null ? void 0 : t2.polygon) === null || i2 === void 0 ? void 0 : i2.enable) !== null && e2 !== void 0 ? e2 : ((o2 = t2 == null ? void 0 : t2.polygon) === null || o2 === void 0 ? void 0 : o2.type) !== void 0 && t2.polygon.type !== To.none;
        }
        loadOptions(t2, i2) {
          if (!this.needsPlugin(i2))
            return;
          const e2 = t2;
          let o2 = e2.polygon;
          (o2 == null ? void 0 : o2.load) === void 0 && (e2.polygon = o2 = new es()), o2.load(i2 == null ? void 0 : i2.polygon);
        }
      }
      class hs {
        constructor(t2, i2, e2, o2) {
          var s3, n2, a2;
          this.absorbers = t2, this.container = i2, this.initialPosition = o2 ? J.create(o2.x, o2.y) : void 0, this.options = e2, this.dragging = false, this.name = this.options.name, this.opacity = this.options.opacity, this.size = nt(e2.size) * i2.retina.pixelRatio, this.mass = this.size * e2.size.density * i2.retina.reduceFactor;
          const r2 = e2.size.limit;
          this.limit = r2 !== void 0 ? r2 * i2.retina.pixelRatio * i2.retina.reduceFactor : r2;
          const l2 = typeof e2.color == "string" ? { value: e2.color } : e2.color;
          this.color = (s3 = Rt(l2)) !== null && s3 !== void 0 ? s3 : { b: 0, g: 0, r: 0 }, this.position = (a2 = (n2 = this.initialPosition) === null || n2 === void 0 ? void 0 : n2.copy()) !== null && a2 !== void 0 ? a2 : this.calcPosition();
        }
        attract(t2) {
          const i2 = this.options;
          if (i2.draggable) {
            const t3 = this.container.interactivity.mouse;
            if (t3.clicking && t3.downPosition) {
              rt(this.position, t3.downPosition) <= this.size && (this.dragging = true);
            } else
              this.dragging = false;
            this.dragging && t3.position && (this.position.x = t3.position.x, this.position.y = t3.position.y);
          }
          const e2 = t2.getPosition(), { dx: o2, dy: s3, distance: n2 } = at(this.position, e2), a2 = J.create(o2, s3);
          if (a2.length = this.mass / Math.pow(n2, 2) * this.container.retina.reduceFactor, n2 < this.size + t2.getRadius()) {
            const e3 = 0.033 * t2.getRadius() * this.container.retina.pixelRatio;
            this.size > t2.getRadius() && n2 < this.size - t2.getRadius() ? i2.destroy ? t2.destroy() : (t2.needsNewPosition = true, this.updateParticlePosition(t2, a2)) : (i2.destroy && (t2.size.value -= e3), this.updateParticlePosition(t2, a2)), (this.limit === void 0 || this.size < this.limit) && (this.size += e3), this.mass += e3 * this.options.size.density * this.container.retina.reduceFactor;
          } else
            this.updateParticlePosition(t2, a2);
        }
        resize() {
          const t2 = this.initialPosition;
          this.position = t2 && mt(t2, this.container.canvas.size) ? t2 : this.calcPosition();
        }
        draw(t2) {
          t2.translate(this.position.x, this.position.y), t2.beginPath(), t2.arc(0, 0, this.size, 0, 2 * Math.PI, false), t2.closePath(), t2.fillStyle = Lt(this.color, this.opacity), t2.fill();
        }
        calcPosition() {
          var t2, i2;
          const e2 = this.container, o2 = this.options.position;
          return J.create(((t2 = o2 == null ? void 0 : o2.x) !== null && t2 !== void 0 ? t2 : 100 * Math.random()) / 100 * e2.canvas.size.width, ((i2 = o2 == null ? void 0 : o2.y) !== null && i2 !== void 0 ? i2 : 100 * Math.random()) / 100 * e2.canvas.size.height);
        }
        updateParticlePosition(t2, i2) {
          var e2;
          if (t2.destroyed)
            return;
          const o2 = this.container.canvas.size;
          if (t2.needsNewPosition) {
            const i3 = t2.getRadius();
            t2.position.x = Math.random() * (o2.width - 2 * i3) + i3, t2.position.y = Math.random() * (o2.height - 2 * i3) + i3, t2.needsNewPosition = false;
          }
          this.options.orbits ? (t2.orbit === void 0 && (t2.orbit = J.create(0, 0), t2.orbit.length = rt(t2.getPosition(), this.position), t2.orbit.angle = Math.random() * Math.PI * 2), t2.orbit.length <= this.size && !this.options.destroy && (t2.orbit.length = Math.random() * Math.max(o2.width, o2.height)), t2.velocity.x = 0, t2.velocity.y = 0, t2.position.setTo(t2.orbit.add(this.position)), t2.orbit.length -= i2.length, t2.orbit.angle += ((e2 = t2.moveSpeed) !== null && e2 !== void 0 ? e2 : it(t2.options.move.speed) * this.container.retina.pixelRatio) / 100 * this.container.retina.reduceFactor) : t2.velocity.addTo(i2);
        }
      }
      class us extends Oi {
        constructor() {
          super(), this.density = 5, this.random.minimumValue = 1, this.value = 50;
        }
        load(t2) {
          t2 && (super.load(t2), t2.density !== void 0 && (this.density = t2.density), t2.limit !== void 0 && (this.limit = t2.limit), t2.limit !== void 0 && (this.limit = t2.limit));
        }
      }
      class vs {
        constructor() {
          this.color = new wi(), this.color.value = "#000000", this.draggable = false, this.opacity = 1, this.destroy = true, this.orbits = false, this.size = new us();
        }
        load(t2) {
          t2 !== void 0 && (t2.color !== void 0 && (this.color = wi.create(this.color, t2.color)), t2.draggable !== void 0 && (this.draggable = t2.draggable), this.name = t2.name, t2.opacity !== void 0 && (this.opacity = t2.opacity), t2.position !== void 0 && (this.position = { x: t2.position.x, y: t2.position.y }), t2.size !== void 0 && this.size.load(t2.size), t2.destroy !== void 0 && (this.destroy = t2.destroy), t2.orbits !== void 0 && (this.orbits = t2.orbits));
        }
      }
      !function(t2) {
        t2.absorber = "absorber";
      }(os || (os = {}));
      class ps {
        constructor(t2) {
          this.container = t2, this.array = [], this.absorbers = [], this.interactivityAbsorbers = [];
          const i2 = t2;
          i2.getAbsorber = (t3) => t3 === void 0 || typeof t3 == "number" ? this.array[t3 || 0] : this.array.find((i3) => i3.name === t3), i2.addAbsorber = (t3, i3) => this.addAbsorber(t3, i3);
        }
        init(t2) {
          var i2, e2;
          if (!t2)
            return;
          t2.absorbers && (t2.absorbers instanceof Array ? this.absorbers = t2.absorbers.map((t3) => {
            const i3 = new vs();
            return i3.load(t3), i3;
          }) : (this.absorbers instanceof Array && (this.absorbers = new vs()), this.absorbers.load(t2.absorbers)));
          const o2 = (e2 = (i2 = t2.interactivity) === null || i2 === void 0 ? void 0 : i2.modes) === null || e2 === void 0 ? void 0 : e2.absorbers;
          if (o2 && (o2 instanceof Array ? this.interactivityAbsorbers = o2.map((t3) => {
            const i3 = new vs();
            return i3.load(t3), i3;
          }) : (this.interactivityAbsorbers instanceof Array && (this.interactivityAbsorbers = new vs()), this.interactivityAbsorbers.load(o2))), this.absorbers instanceof Array)
            for (const t3 of this.absorbers)
              this.addAbsorber(t3);
          else
            this.addAbsorber(this.absorbers);
        }
        particleUpdate(t2) {
          for (const i2 of this.array)
            if (i2.attract(t2), t2.destroyed)
              break;
        }
        draw(t2) {
          for (const i2 of this.array)
            t2.save(), i2.draw(t2), t2.restore();
        }
        stop() {
          this.array = [];
        }
        resize() {
          for (const t2 of this.array)
            t2.resize();
        }
        handleClickMode(t2) {
          const i2 = this.container, e2 = this.absorbers, o2 = this.interactivityAbsorbers;
          if (t2 === os.absorber) {
            let t3;
            o2 instanceof Array ? o2.length > 0 && (t3 = yt(o2)) : t3 = o2;
            const s3 = t3 != null ? t3 : e2 instanceof Array ? yt(e2) : e2, n2 = i2.interactivity.mouse.clickPosition;
            this.addAbsorber(s3, n2);
          }
        }
        addAbsorber(t2, i2) {
          const e2 = new hs(this, this.container, t2, i2);
          return this.array.push(e2), e2;
        }
        removeAbsorber(t2) {
          const i2 = this.array.indexOf(t2);
          i2 >= 0 && this.array.splice(i2, 1);
        }
      }
      class fs {
        constructor() {
          this.id = "absorbers";
        }
        getPlugin(t2) {
          return new ps(t2);
        }
        needsPlugin(t2) {
          var i2, e2, o2;
          if (t2 === void 0)
            return false;
          const s3 = t2.absorbers;
          return s3 instanceof Array && !!s3.length || s3 !== void 0 || !!((o2 = (e2 = (i2 = t2.interactivity) === null || i2 === void 0 ? void 0 : i2.events) === null || e2 === void 0 ? void 0 : e2.onClick) === null || o2 === void 0 ? void 0 : o2.mode) && pt(os.absorber, t2.interactivity.events.onClick.mode);
        }
        loadOptions(t2, i2) {
          var e2, o2;
          if (!this.needsPlugin(t2) && !this.needsPlugin(i2))
            return;
          const s3 = t2;
          if (i2 == null ? void 0 : i2.absorbers)
            if ((i2 == null ? void 0 : i2.absorbers) instanceof Array)
              s3.absorbers = i2 == null ? void 0 : i2.absorbers.map((t3) => {
                const i3 = new vs();
                return i3.load(t3), i3;
              });
            else {
              let t3 = s3.absorbers;
              (t3 == null ? void 0 : t3.load) === void 0 && (s3.absorbers = t3 = new vs()), t3.load(i2 == null ? void 0 : i2.absorbers);
            }
          const n2 = (o2 = (e2 = i2 == null ? void 0 : i2.interactivity) === null || e2 === void 0 ? void 0 : e2.modes) === null || o2 === void 0 ? void 0 : o2.absorbers;
          if (n2)
            if (n2 instanceof Array)
              s3.interactivity.modes.absorbers = n2.map((t3) => {
                const i3 = new vs();
                return i3.load(t3), i3;
              });
            else {
              let t3 = s3.interactivity.modes.absorbers;
              (t3 == null ? void 0 : t3.load) === void 0 && (s3.interactivity.modes.absorbers = t3 = new vs()), t3.load(n2);
            }
        }
      }
      const ys = new class extends class {
        constructor() {
          So.set(this, void 0), Do(this, So, false, "f");
          const t2 = new A(), i2 = new li(), e2 = new di();
          si.addShapeDrawer(U.line, new hi()), si.addShapeDrawer(U.circle, new ui()), si.addShapeDrawer(U.edge, t2), si.addShapeDrawer(U.square, t2), si.addShapeDrawer(U.triangle, new pi()), si.addShapeDrawer(U.star, new fi()), si.addShapeDrawer(U.polygon, new yi()), si.addShapeDrawer(U.char, i2), si.addShapeDrawer(U.character, i2), si.addShapeDrawer(U.image, e2), si.addShapeDrawer(U.images, e2);
        }
        init() {
          _o(this, So, "f") || Do(this, So, true, "f");
        }
        loadFromArray(t2, i2, e2) {
          return Io(this, void 0, void 0, function* () {
            return Oo.load(t2, i2, e2);
          });
        }
        load(t2, i2) {
          return Io(this, void 0, void 0, function* () {
            return Oo.load(t2, i2);
          });
        }
        set(t2, i2, e2) {
          return Io(this, void 0, void 0, function* () {
            return Oo.set(t2, i2, e2);
          });
        }
        loadJSON(t2, i2, e2) {
          return Oo.loadJSON(t2, i2, e2);
        }
        setJSON(t2, i2, e2, o2) {
          return Io(this, void 0, void 0, function* () {
            return Oo.setJSON(t2, i2, e2, o2);
          });
        }
        setOnClickHandler(t2) {
          Oo.setOnClickHandler(t2);
        }
        dom() {
          return Oo.dom();
        }
        domItem(t2) {
          return Oo.domItem(t2);
        }
        addShape(t2, i2, e2, o2, s3) {
          let n2;
          n2 = typeof i2 == "function" ? { afterEffect: o2, destroy: s3, draw: i2, init: e2 } : i2, si.addShapeDrawer(t2, n2);
        }
        addPreset(t2, i2, e2 = false) {
          si.addPreset(t2, i2, e2);
        }
        addPlugin(t2) {
          si.addPlugin(t2);
        }
        addPathGenerator(t2, i2) {
          si.addPathGenerator(t2, i2);
        }
        addInteractor(t2, i2) {
          si.addInteractor(t2, i2);
        }
        addParticleUpdater(t2, i2) {
          si.addParticleUpdater(t2, i2);
        }
      } {
        constructor() {
          super(), function(t2) {
            const i2 = new fs();
            t2.addPlugin(i2);
          }(this), function(t2) {
            const i2 = new Qo();
            t2.addPlugin(i2);
          }(this), function(t2) {
            const i2 = new $o();
            t2.addPlugin(i2), t2.addInteractor("particlesInfection", (t3) => new Fo(t3));
          }(this), function(t2) {
            const i2 = new ds();
            t2.addPlugin(i2);
          }(this);
        }
      }();
      function ms(i2) {
        let e2;
        return { c() {
          var t2;
          t2 = "div", e2 = document.createElement(t2), h(e2, "id", i2[0]);
        }, m(t2, i3) {
          !function(t3, i4, e3) {
            r && !e3 ? c(t3, i4) : (i4.parentNode !== t3 || e3 && i4.nextSibling !== e3) && t3.insertBefore(i4, e3 || null);
          }(t2, e2, i3);
        }, p(t2, [i3]) {
          1 & i3 && h(e2, "id", t2[0]);
        }, i: t, o: t, d(t2) {
          t2 && d(e2);
        } };
      }
      ys.init(), ((t2) => {
        const i2 = (i3, e2) => t2.load(i3, e2);
        i2.load = (i3, e2, o2) => {
          t2.loadJSON(i3, e2).then((t3) => {
            t3 && o2(t3);
          }).catch(() => {
            o2(void 0);
          });
        }, i2.setOnClickHandler = (i3) => {
          t2.setOnClickHandler(i3);
        };
        t2.dom();
      })(ys);
      const gs = "particlesLoaded";
      function bs(t2, i2, e2) {
        let { options: o2 = {} } = i2, { url: s3 = "" } = i2, { id: n2 = "tsparticles" } = i2;
        const a2 = p();
        let r2 = n2;
        var l2;
        return l2 = () => {
          if (ys.init(), a2("particlesInit", ys), r2) {
            const t3 = ys.dom().find((t4) => t4.id === r2);
            t3 && t3.destroy();
          }
          if (n2) {
            const t3 = (t4) => {
              a2(gs, { particles: t4 }), r2 = n2;
            };
            s3 ? ys.loadJSON(n2, s3).then(t3) : o2 ? ys.load(n2, o2).then(t3) : console.error("You must specify options or url to load tsParticles");
          } else
            a2(gs, { particles: void 0 });
        }, v().$$.after_update.push(l2), t2.$$set = (t3) => {
          "options" in t3 && e2(1, o2 = t3.options), "url" in t3 && e2(2, s3 = t3.url), "id" in t3 && e2(0, n2 = t3.id);
        }, [n2, o2, s3];
      }
      return class extends class {
        $destroy() {
          !function(t2, i2) {
            const e2 = t2.$$;
            e2.fragment !== null && (o(e2.on_destroy), e2.fragment && e2.fragment.d(i2), e2.on_destroy = e2.fragment = null, e2.ctx = []);
          }(this, 1), this.$destroy = t;
        }
        $on(t2, i2) {
          const e2 = this.$$.callbacks[t2] || (this.$$.callbacks[t2] = []);
          return e2.push(i2), () => {
            const t3 = e2.indexOf(i2);
            t3 !== -1 && e2.splice(t3, 1);
          };
        }
        $set(t2) {
          var i2;
          this.$$set && (i2 = t2, Object.keys(i2).length !== 0) && (this.$$.skip_bound = true, this.$$set(t2), this.$$.skip_bound = false);
        }
      } {
        constructor(t2) {
          super(), S(this, t2, bs, ms, n, { options: 1, url: 2, id: 0 });
        }
        get options() {
          return this.$$.ctx[1];
        }
        set options(t2) {
          this.$set({ options: t2 }), z();
        }
        get url() {
          return this.$$.ctx[2];
        }
        set url(t2) {
          this.$set({ url: t2 }), z();
        }
        get id() {
          return this.$$.ctx[0];
        }
        set id(t2) {
          this.$set({ id: t2 }), z();
        }
      };
    });
  }
});

// .svelte-kit/vercel/entry.js
__export(exports, {
  default: () => entry_default
});
init_shims();

// node_modules/@sveltejs/kit/dist/node.js
init_shims();
function getRawBody(req) {
  return new Promise((fulfil, reject) => {
    const h = req.headers;
    if (!h["content-type"]) {
      return fulfil(null);
    }
    req.on("error", reject);
    const length = Number(h["content-length"]);
    if (isNaN(length) && h["transfer-encoding"] == null) {
      return fulfil(null);
    }
    let data = new Uint8Array(length || 0);
    if (length > 0) {
      let offset = 0;
      req.on("data", (chunk) => {
        const new_len = offset + Buffer.byteLength(chunk);
        if (new_len > length) {
          return reject({
            status: 413,
            reason: 'Exceeded "Content-Length" limit'
          });
        }
        data.set(chunk, offset);
        offset = new_len;
      });
    } else {
      req.on("data", (chunk) => {
        const new_data = new Uint8Array(data.length + chunk.length);
        new_data.set(data, 0);
        new_data.set(chunk, data.length);
        data = new_data;
      });
    }
    req.on("end", () => {
      const [type] = h["content-type"].split(/;\s*/);
      if (type === "application/octet-stream") {
        return fulfil(data);
      }
      const encoding = h["content-encoding"] || "utf-8";
      fulfil(new TextDecoder(encoding).decode(data));
    });
  });
}

// .svelte-kit/output/server/app.js
init_shims();

// node_modules/@sveltejs/kit/dist/ssr.js
init_shims();
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = [];
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (let i = 0; i < subscribers.length; i += 1) {
          const s2 = subscribers[i];
          s2[1]();
          subscriber_queue.push(s2, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      const index2 = subscribers.indexOf(subscriber);
      if (index2 !== -1) {
        subscribers.splice(index2, 1);
      }
      if (subscribers.length === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update: update2, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var s$1 = JSON.stringify;
async function render_response({
  options: options2,
  $session,
  page_config,
  status,
  error: error3,
  branch,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error3) {
    error3.stack = options2.get_stack(error3);
  }
  if (branch) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error4) => {
      throw new Error(`Failed to serialize session data: ${error4.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error3)},
					nodes: [
						${branch.map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page.path)},
						query: new URLSearchParams(${s$1(page.query.toString())}),
						params: ${s$1(page.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url="${url}"`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n			")}
		`.replace(/^\t{2}/gm, "");
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(err);
    return null;
  }
}
function serialize_error(error3) {
  if (!error3)
    return null;
  let serialized = try_serialize(error3);
  if (!serialized) {
    const { name, message, stack, frame, loc } = error3;
    serialized = try_serialize({ name, message, stack, frame, loc });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  if (loaded.error) {
    const error3 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    const status = loaded.status;
    if (!(error3 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error3}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error3 };
    }
    return { status, error: error3 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
function resolve(base, path) {
  const baseparts = path[0] === "/" ? [] : base.slice(1).split("/");
  const pathparts = path[0] === "/" ? path.slice(1).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  return `/${baseparts.join("/")}`;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  context,
  is_leaf,
  is_error,
  status,
  error: error3
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let loaded;
  if (module2.load) {
    const load_input = {
      page,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        if (options2.read && url.startsWith(options2.paths.assets)) {
          url = url.replace(options2.paths.assets, "");
        }
        if (url.startsWith("//")) {
          throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
        }
        let response;
        if (/^[a-zA-Z]+:/.test(url)) {
          const request2 = new Request(url, opts);
          response = await options2.hooks.serverFetch.call(null, request2);
        } else {
          const [path, search] = url.split("?");
          const resolved = resolve(request.path, path);
          const filename = resolved.slice(1);
          const filename_html = `${filename}/index.html`;
          const asset = options2.manifest.assets.find((d) => d.file === filename || d.file === filename_html);
          if (asset) {
            if (options2.read) {
              response = new Response(options2.read(asset.file), {
                headers: {
                  "content-type": asset.type
                }
              });
            } else {
              response = await fetch(`http://${page.host}/${asset.file}`, opts);
            }
          }
          if (!response) {
            const headers = { ...opts.headers };
            if (opts.credentials !== "omit") {
              uses_credentials = true;
              headers.cookie = request.headers.cookie;
              if (!headers.authorization) {
                headers.authorization = request.headers.authorization;
              }
            }
            if (opts.body && typeof opts.body !== "string") {
              throw new Error("Request body must be a string");
            }
            const rendered = await respond({
              host: request.host,
              method: opts.method || "GET",
              headers,
              path: resolved,
              rawBody: opts.body,
              query: new URLSearchParams(search)
            }, options2, {
              fetched: url,
              initiator: route
            });
            if (rendered) {
              if (state.prerender) {
                state.prerender.dependencies.set(resolved, rendered);
              }
              response = new Response(rendered.body, {
                status: rendered.status,
                headers: rendered.headers
              });
            }
          }
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 !== "etag" && key2 !== "set-cookie")
                    headers[key2] = value;
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape(body)}}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      context: { ...context }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error3;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  return {
    node,
    loaded: normalize(loaded),
    context: loaded.context || context,
    fetched,
    uses_credentials
  };
}
var escaped = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped) {
      result += escaped[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error3 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    context: {},
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      context: loaded.context,
      is_leaf: false,
      is_error: true,
      status,
      error: error3
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error3,
      branch,
      page
    });
  } catch (error4) {
    options2.handle_error(error4);
    return {
      status: 500,
      headers: {},
      body: error4.stack
    };
  }
}
async function respond$1({ request, options: options2, state, $session, route }) {
  const match = route.pattern.exec(request.path);
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id && options2.load_component(id)));
  } catch (error4) {
    options2.handle_error(error4);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error4
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  const page_config = {
    ssr: "ssr" in leaf ? leaf.ssr : options2.ssr,
    router: "router" in leaf ? leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? leaf.hydrate : options2.hydrate
  };
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: null
    };
  }
  let branch;
  let status = 200;
  let error3;
  ssr:
    if (page_config.ssr) {
      let context = {};
      branch = [];
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              request,
              options: options2,
              state,
              route,
              page,
              node,
              $session,
              context,
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            if (loaded.loaded.redirect) {
              return {
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              };
            }
            if (loaded.loaded.error) {
              ({ status, error: error3 } = loaded.loaded);
            }
          } catch (e) {
            options2.handle_error(e);
            status = 500;
            error3 = e;
          }
          if (error3) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let error_loaded;
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  error_loaded = await load_node({
                    request,
                    options: options2,
                    state,
                    route,
                    page,
                    node: error_node,
                    $session,
                    context: node_loaded.context,
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error3
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (e) {
                  options2.handle_error(e);
                  continue;
                }
              }
            }
            return await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error3
            });
          }
        }
        branch.push(loaded);
        if (loaded && loaded.loaded.context) {
          context = {
            ...context,
            ...loaded.loaded.context
          };
        }
      }
    }
  try {
    return await render_response({
      options: options2,
      $session,
      page_config,
      status,
      error: error3,
      branch: branch && branch.filter(Boolean),
      page
    });
  } catch (error4) {
    options2.handle_error(error4);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error4
    });
  }
}
async function render_page(request, route, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const $session = await options2.hooks.getSession(request);
  if (route) {
    const response = await respond$1({
      request,
      options: options2,
      state,
      $session,
      route
    });
    if (response) {
      return response;
    }
    if (state.fetched) {
      return {
        status: 500,
        headers: {},
        body: `Bad request in load function: failed to fetch ${state.fetched}`
      };
    }
  } else {
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 404,
      error: new Error(`Not found: ${request.path}`)
    });
  }
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
async function render_route(request, route) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (handler) {
    const match = route.pattern.exec(request.path);
    const params = route.params(match);
    const response = await handler({ ...request, params });
    if (response) {
      if (typeof response !== "object") {
        return error(`Invalid response from route ${request.path}: expected an object, got ${typeof response}`);
      }
      let { status = 200, body, headers = {} } = response;
      headers = lowercase_keys(headers);
      const type = headers["content-type"];
      if (type === "application/octet-stream" && !(body instanceof Uint8Array)) {
        return error(`Invalid response from route ${request.path}: body must be an instance of Uint8Array if content type is application/octet-stream`);
      }
      if (body instanceof Uint8Array && type !== "application/octet-stream") {
        return error(`Invalid response from route ${request.path}: Uint8Array body must be accompanied by content-type: application/octet-stream header`);
      }
      let normalized_body;
      if (typeof body === "object" && (!type || type === "application/json" || type === "application/json; charset=utf-8")) {
        headers = { ...headers, "content-type": "application/json; charset=utf-8" };
        normalized_body = JSON.stringify(body);
      } else {
        normalized_body = body;
      }
      return { status, body: normalized_body, headers };
    }
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        map.get(key).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  #map;
  constructor(map) {
    this.#map = map;
  }
  get(key) {
    const value = this.#map.get(key);
    return value && value[0];
  }
  getAll(key) {
    return this.#map.get(key);
  }
  has(key) {
    return this.#map.has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of this.#map)
      yield key;
  }
  *values() {
    for (const [, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
};
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const [type, ...directives] = headers["content-type"].split(/;\s*/);
  if (typeof raw === "string") {
    switch (type) {
      case "text/plain":
        return raw;
      case "application/json":
        return JSON.parse(raw);
      case "application/x-www-form-urlencoded":
        return get_urlencoded(raw);
      case "multipart/form-data": {
        const boundary = directives.find((directive) => directive.startsWith("boundary="));
        if (!boundary)
          throw new Error("Missing boundary");
        return get_multipart(raw, boundary.slice("boundary=".length));
      }
      default:
        throw new Error(`Invalid Content-Type ${type}`);
    }
  }
  return raw;
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  const nope = () => {
    throw new Error("Malformed form data");
  };
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    nope();
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          nope();
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      nope();
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !incoming.path.split("/").pop().includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: encodeURI(path + (q ? `?${q}` : ""))
        }
      };
    }
  }
  try {
    const headers = lowercase_keys(incoming.headers);
    return await options2.hooks.handle({
      request: {
        ...incoming,
        headers,
        body: parse_body(incoming.rawBody, headers),
        params: null,
        locals: {}
      },
      resolve: async (request) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            error: null,
            branch: [],
            page: null
          });
        }
        for (const route of options2.manifest.routes) {
          if (!route.pattern.test(request.path))
            continue;
          const response = route.type === "endpoint" ? await render_route(request, route) : await render_page(request, route, options2, state);
          if (response) {
            if (response.status === 200) {
              if (!/(no-store|immutable)/.test(response.headers["cache-control"])) {
                const etag = `"${hash(response.body)}"`;
                if (request.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: null
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        return await render_page(request, null, options2, state);
      }
    });
  } catch (e) {
    options2.handle_error(e);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}

// .svelte-kit/output/server/app.js
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function custom_event(type, detail) {
  const e = document.createEvent("CustomEvent");
  e.initCustomEvent(type, false, false, detail);
  return e;
}
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
  get_current_component().$$.after_update.push(fn);
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(type, detail);
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
    }
  };
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
var dirty_components = [];
var binding_callbacks = [];
var render_callbacks = [];
var flush_callbacks = [];
var resolved_promise = Promise.resolve();
var update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function tick() {
  schedule_update();
  return resolved_promise;
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
var flushing = false;
var seen_callbacks = new Set();
function flush() {
  if (flushing)
    return;
  flushing = true;
  do {
    for (let i = 0; i < dirty_components.length; i += 1) {
      const component = dirty_components[i];
      set_current_component(component);
      update(component.$$);
    }
    set_current_component(null);
    dirty_components.length = 0;
    while (binding_callbacks.length)
      binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  flushing = false;
  seen_callbacks.clear();
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
var escaped2 = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape2(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped2[match]);
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape2(value)) : `"${value}"`}`}`;
}
var css = {
  code: "#svelte-announcer.svelte-1pdgbjn{clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;left:0;overflow:hidden;position:absolute;top:0;white-space:nowrap;width:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>#svelte-announcer{clip:rect(0 0 0 0);-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;left:0;overflow:hidden;position:absolute;top:0;white-space:nowrap;width:1px}</style>"],"names":[],"mappings":"AAqDO,gCAAiB,CAAC,KAAK,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,kBAAkB,MAAM,GAAG,CAAC,CAAC,UAAU,MAAM,GAAG,CAAC,CAAC,OAAO,GAAG,CAAC,KAAK,CAAC,CAAC,SAAS,MAAM,CAAC,SAAS,QAAQ,CAAC,IAAI,CAAC,CAAC,YAAY,MAAM,CAAC,MAAM,GAAG,CAAC"}`
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  let mounted = false;
  let navigated = false;
  let title = null;
  onMount(() => {
    const unsubscribe = stores.page.subscribe(() => {
      if (mounted) {
        navigated = true;
        title = document.title || "untitled page";
      }
    });
    mounted = true;
    return unsubscribe;
  });
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${mounted ? `<div id="${"svelte-announcer"}" aria-live="${"assertive"}" aria-atomic="${"true"}" class="${"svelte-1pdgbjn"}">${navigated ? `${escape2(title)}` : ``}</div>` : ``}`;
});
function set_paths(paths) {
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
var template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="/favicon.png" />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		' + head + '\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
var options = null;
var default_settings = { paths: { "base": "", "assets": "/." } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: "/./_app/start-75bf5883.js",
      css: ["/./_app/assets/start-0826e215.css"],
      js: ["/./_app/start-75bf5883.js", "/./_app/chunks/vendor-896edeeb.js", "/./_app/chunks/preload-helper-9f12a5fd.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => "/./_app/" + entry_lookup[id],
    get_stack: (error22) => String(error22),
    handle_error: (error22) => {
      if (error22.frame) {
        console.error(error22.frame);
      }
      console.error(error22.stack);
      error22.stack = options.get_stack(error22);
    },
    hooks: get_hooks(user_hooks),
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
var empty = () => ({});
var manifest = {
  assets: [{ "file": "apollo-tiny.webp", "size": 1960, "type": "image/webp" }, { "file": "codegen.webp", "size": 4740, "type": "image/webp" }, { "file": "expo-tiny.webp", "size": 3506, "type": "image/webp" }, { "file": "icon.png", "size": 21963, "type": "image/png" }, { "file": "paper.webp", "size": 2172, "type": "image/webp" }, { "file": "particles/stat_buff.json", "size": 2300, "type": "application/json" }, { "file": "postgraphile-tiny.webp", "size": 2230, "type": "image/webp" }, { "file": "postgres-tiny.webp", "size": 3124, "type": "image/webp" }, { "file": "postgres.png", "size": 6540, "type": "image/png" }, { "file": "postgres.webp", "size": 2132, "type": "image/webp" }, { "file": "react-native.webp", "size": 4424, "type": "image/webp" }, { "file": "typescript.webp", "size": 4258, "type": "image/webp" }],
  layout: "src/routes/__layout.svelte",
  error: ".svelte-kit/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  serverFetch: hooks.serverFetch || fetch
});
var module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error2;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index;
  })
};
var metadata_lookup = { "src/routes/__layout.svelte": { "entry": "/./_app/pages/__layout.svelte-e8ce727d.js", "css": ["/./_app/assets/pages/__layout.svelte-d505adf2.css"], "js": ["/./_app/pages/__layout.svelte-e8ce727d.js", "/./_app/chunks/vendor-896edeeb.js"], "styles": null }, ".svelte-kit/build/components/error.svelte": { "entry": "/./_app/error.svelte-76993c91.js", "css": [], "js": ["/./_app/error.svelte-76993c91.js", "/./_app/chunks/vendor-896edeeb.js"], "styles": null }, "src/routes/index.svelte": { "entry": "/./_app/pages/index.svelte-4ff68d88.js", "css": [], "js": ["/./_app/pages/index.svelte-4ff68d88.js", "/./_app/chunks/vendor-896edeeb.js", "/./_app/chunks/preload-helper-9f12a5fd.js"], "styles": null } };
async function load_component(file) {
  return {
    module: await module_lookup[file](),
    ...metadata_lookup[file]
  };
}
function render(request, {
  prerender: prerender2
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender: prerender2 });
}
var _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${slots.default ? slots.default({}) : ``}`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
function load({ error: error22, status }) {
  return { props: { error: error22, status } };
}
var Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error22 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error22 !== void 0)
    $$bindings.error(error22);
  return `<h1>${escape2(status)}</h1>

<pre>${escape2(error22.message)}</pre>



${error22.frame ? `<pre>${escape2(error22.frame)}</pre>` : ``}
${error22.stack ? `<pre>${escape2(error22.stack)}</pre>` : ``}`;
});
var error2 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Error$1,
  load
});
var IntersectionObserver_1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { element = null } = $$props;
  let { once = false } = $$props;
  let { root = null } = $$props;
  let { rootMargin = "0px" } = $$props;
  let { threshold = 0 } = $$props;
  let { entry = null } = $$props;
  let { intersecting = false } = $$props;
  let { observer = null } = $$props;
  const dispatch = createEventDispatcher();
  let prevRootMargin = null;
  let prevElement = null;
  const initialize = () => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((_entry) => {
        entry = _entry;
        intersecting = _entry.isIntersecting;
      });
    }, { root, rootMargin, threshold });
  };
  onMount(() => {
    initialize();
    return () => {
      if (observer)
        observer.disconnect();
    };
  });
  afterUpdate(async () => {
    if (entry !== null) {
      dispatch("observe", entry);
      if (entry.isIntersecting) {
        dispatch("intersect", entry);
        if (once)
          observer.unobserve(element);
      }
    }
    await tick();
    if (element !== null && element !== prevElement) {
      observer.observe(element);
      if (prevElement !== null)
        observer.unobserve(prevElement);
      prevElement = element;
    }
    if (prevRootMargin && rootMargin !== prevRootMargin) {
      observer.disconnect();
      prevElement = null;
      initialize();
    }
    prevRootMargin = rootMargin;
  });
  if ($$props.element === void 0 && $$bindings.element && element !== void 0)
    $$bindings.element(element);
  if ($$props.once === void 0 && $$bindings.once && once !== void 0)
    $$bindings.once(once);
  if ($$props.root === void 0 && $$bindings.root && root !== void 0)
    $$bindings.root(root);
  if ($$props.rootMargin === void 0 && $$bindings.rootMargin && rootMargin !== void 0)
    $$bindings.rootMargin(rootMargin);
  if ($$props.threshold === void 0 && $$bindings.threshold && threshold !== void 0)
    $$bindings.threshold(threshold);
  if ($$props.entry === void 0 && $$bindings.entry && entry !== void 0)
    $$bindings.entry(entry);
  if ($$props.intersecting === void 0 && $$bindings.intersecting && intersecting !== void 0)
    $$bindings.intersecting(intersecting);
  if ($$props.observer === void 0 && $$bindings.observer && observer !== void 0)
    $$bindings.observer(observer);
  return `${slots.default ? slots.default({ intersecting, entry, observer }) : ``}`;
});
var MediaQuery = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { query } = $$props;
  let mql;
  let mqlListener;
  let wasMounted = false;
  let matches = false;
  onMount(() => {
    wasMounted = true;
    return () => {
      removeActiveListener();
    };
  });
  function addNewListener(query2) {
    mql = window.matchMedia(query2);
    mqlListener = (v) => matches = v.matches;
    mql.addEventListener("change", mqlListener);
    matches = mql.matches;
  }
  function removeActiveListener() {
    if (mql && mqlListener) {
      mql.removeEventListener("change", mqlListener);
    }
  }
  if ($$props.query === void 0 && $$bindings.query && query !== void 0)
    $$bindings.query(query);
  {
    {
      if (wasMounted) {
        removeActiveListener();
        addNewListener(query);
      }
    }
  }
  return `${slots.default ? slots.default({ matches }) : ``}`;
});
var Ball = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let element;
  let { src: src2 } = $$props;
  let { selected } = $$props;
  let { onPress } = $$props;
  if ($$props.src === void 0 && $$bindings.src && src2 !== void 0)
    $$bindings.src(src2);
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  if ($$props.onPress === void 0 && $$bindings.onPress && onPress !== void 0)
    $$bindings.onPress(onPress);
  return `${validate_component(MediaQuery, "MediaQuery").$$render($$result, { query: "(min-width: 768px)" }, {}, {
    default: ({ matches }) => `${validate_component(IntersectionObserver_1, "IntersectionObserver").$$render($$result, { element, threshold: 1, once: matches }, {}, {
      default: () => `<button class="${"h-48 w-48 ml-12 md:ml-12 flex-shrink-0 focus:outline-none rounded-full flex justify-center items-center bg-white m-3 overflow-hidden shadow-md p-8 z-10 " + escape2(selected ? "ring-4 transition-transform scale-110 shadow-lg opacity-70 md:opacity-100" : "")}"${add_attribute("this", element, 1)}><img alt="${"Noice"}"${add_attribute("src", src2, 0)}></button>`
    })}`
  })}`;
});
var Particles = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let ParticlesComponent;
  onMount(() => {
    fetch("/particles/stat_buff.json").then((response) => response.json()).then((json) => {
      particlesConfig = json;
    });
    Promise.resolve().then(() => __toModule(require_svelte_particles())).then((module2) => {
      ParticlesComponent = module2.default;
    });
  });
  let particlesConfig;
  return `${validate_component(ParticlesComponent || missing_component, "svelte:component").$$render($$result, {
    id: "tsparticles",
    options: particlesConfig
  }, {}, {})}`;
});
var prerender = true;
var Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let selectedBall = 3;
  return `${validate_component(Particles, "Particles").$$render($$result, {}, {}, {})}
<div class="${"h-screen w-screen md:container md:mx-auto flex items-center md:items-start md:justify-center z-50"}"><div class="${"flex flex-row md:justify-center  p-3 md:mt-48 overflow-y-hidden"}">${validate_component(Ball, "Ball").$$render($$result, {
    src: "icon.png",
    selected: selectedBall === 3,
    onPress: () => {
      selectedBall = 3;
    }
  }, {}, {})}
    ${validate_component(Ball, "Ball").$$render($$result, {
    src: "https://idsihealth.org/wp-content/uploads/2015/01/University-of-Glasgow.jpg",
    selected: selectedBall === 0,
    onPress: () => {
      selectedBall = 0;
    }
  }, {}, {})}
    ${validate_component(Ball, "Ball").$$render($$result, {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/41/Uros-logo-plain.png",
    selected: selectedBall === 1,
    onPress: () => {
      selectedBall = 1;
    }
  }, {}, {})}
    ${validate_component(Ball, "Ball").$$render($$result, {
    src: "https://brokerchooser.com/uploads/broker_logos/barclays-review.png",
    selected: selectedBall === 2,
    onPress: () => {
      selectedBall = 2;
    }
  }, {}, {})}</div></div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes,
  prerender
});

// .svelte-kit/vercel/entry.js
init();
var entry_default = async (req, res) => {
  const { pathname, searchParams } = new URL(req.url || "", "http://localhost");
  let body;
  try {
    body = await getRawBody(req);
  } catch (err) {
    res.statusCode = err.status || 400;
    return res.end(err.reason || "Invalid request body");
  }
  const rendered = await render({
    method: req.method,
    headers: req.headers,
    path: pathname,
    query: searchParams,
    rawBody: body
  });
  if (rendered) {
    const { status, headers, body: body2 } = rendered;
    return res.writeHead(status, headers).end(body2);
  }
  return res.writeHead(404).end();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
