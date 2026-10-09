// ======================================================
// API Error
// ======================================================

export class ApiError
  extends Error {
  constructor(
    message,
    {
      status =
        0,

      code =
        null,

      details =
        null,

      data =
        null,
    } = {}
  ) {
    super(
      message
    );


    this.name =
      "ApiError";

    this.status =
      status;

    this.code =
      code;

    this.details =
      details;

    this.data =
      data;
  }
}


// ======================================================
// API Fetch
//
// All browser API requests should eventually use this
// helper.
//
// Important:
// credentials: "include" allows the browser to send the
// HttpOnly Mimoria session cookie.
// ======================================================

export async function apiFetch(
  url,
  options = {}
) {
  const {
    headers:
      suppliedHeaders =
        {},

    body,

    ...restOptions
  } =
    options;


  const headers =
    new Headers(
      suppliedHeaders
    );


  let finalBody =
    body;


  /*
   * Automatically serialize plain JavaScript objects.
   *
   * FormData, strings, Blob, etc. are left unchanged.
   */
  if (
    body !==
      undefined &&
    body !==
      null &&
    typeof body ===
      "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)
  ) {
    if (
      !headers.has(
        "Content-Type"
      )
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );
    }


    finalBody =
      JSON.stringify(
        body
      );
  }


  const response =
    await fetch(
      url,
      {
        ...restOptions,

        credentials:
          "include",

        headers,

        body:
          finalBody,
      }
    );


  const contentType =
    response.headers.get(
      "content-type"
    ) ||
    "";


  let data =
    null;


  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data =
      await response
        .json()
        .catch(
          () => null
        );
  } else {
    const text =
      await response
        .text()
        .catch(
          () => ""
        );


    data =
      text ||
      null;
  }


  if (
    !response.ok
  ) {
    const message =
      typeof data ===
        "object" &&
      data?.message
        ? data.message
        : `Request failed with status ${response.status}`;


    throw new ApiError(
      message,
      {
        status:
          response.status,

        code:
          typeof data ===
            "object"
            ? data?.code ||
              null
            : null,

        details:
          typeof data ===
            "object"
            ? data?.details ||
              null
            : null,

        data,
      }
    );
  }


  return data;
}


export default apiFetch;