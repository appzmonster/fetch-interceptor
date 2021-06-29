# Fetch-interceptor

Fetch-interceptor is a JavaScript library to enable request interceptor feature on [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). The library extends Fetch API and make use of [fluent API](https://en.wikipedia.org/wiki/Fluent_interface) design principle to chain one or multiple request interceptors to a Fetch API request.

Example syntax:
```
fetch
    .with(new Timing())
    .with(new BearerTokenHandler())(
        "https://graph.microsoft.com/v1.0/users/me",
        {
            method: 'GET'
        }
    );

```


### What is "Request interceptor"?
---
Request interceptor is a function that gets activated (invoked) on an outgoing request (in-flight). When a request interceptor is activated, it can perform additional processing on the outgoing request such as adding or changing request header. Also, when the request returns, the same request interceptor receives the response from the request and can perform additional processing on the response before returning the response to the caller. For example, a request interceptor can transform a xml response to json response and return the json response to the caller.

In summary, a request interceptor enables the ability to "intercept" and "process" the request and response of a browser request.


## Prerequisites
---
The library extends [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and expects the browser supports Fetch API. The library does not include polyfill to enable Fetch API. Necessary Fetch API polyfill must be implemented for browser that does not support Fetch API before using this library.


## Installation
---
Fetch-interceptor is available as NPM package.

```
npm install @appzmonster/fetch-interceptor
```


## Usage
---
You can start using fetch-interceptor by enabling it globally in your JavaScript application.

```
import { initialize } from '@appzmonster/fetch-interceptor';
initialize();
```

Typically, you'll code the above in `./index.js` or any JavaScript file that you use as the entry point to your application. Also, take note that you just need to invoke `initialize()` function once per application lifecycle. The `initialize()` function will checks the existence of `'fetch'` in `window` object and do necessary extension.

>NOTE: Invoking `initialize()` multiple times does not throw error or having any undesired side effect.


### Invoke fetch with request interceptor
---
In order to use request interceptor in a fetch request, you have to add the desired request interceptor to the request.

Using async / await:
```
let response = await fetch.with(/*request interceptor here*/)("https://some-api.somedomain.com", { method: 'GET', mode: 'cors' });
```

Using promise
```
fetch.with(/*request interceptor here*/)("https://some-api.somedomain.com", { method: 'GET', mode: 'cors' }).then(...
```

You can add one or multiple request interceptors to a request. **When multiple request interceptors are added (chained together)**, these request interceptors get invoked in a **specific order**:

> ***When a request is outgoing***, each request interceptor added to the fetch request is activated in the **same order** of how they are added. Each request interceptor is provided with both the `resource` and `init` (refer to arguments of [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)), basically the fetch request arguments. The request interceptor can manipulate these arguments and pass them to the next request interceptor in line. This continues until the last request interceptor in line sends out the request to the designated service API. The request is sent out using the manipulated `resource` and `init` arguments (not the original version). For example, if you chained 2 request interceptors **A** and **B** with **A** interceptor adds a "X-SomeName" header to the request, when **B** interceptor is invoked, it has the "X-SomeName" header added by **A** interceptor.

> ***When a request returns to the caller with response***, the added request interceptors are invoked in the **reverse order** of how they are added. Using the same example above (**A** and **B**), **B** interceptor is invoked first follows by **A** interceptor. For example, if **B** interceptor modifies the response, when **A** interceptor is invoked, it receives the modified response from **B** instead of the original response from the service API.

Chaining multiple request interceptors creates a very powerful fetch request to solve complex use case. For example, in a typical [OAuth 2.0](https://oauth.net/2/pkce/) and [Microservice](https://microservices.io/) use case, very often you need to send a request with a valid bearer token which you exchange with an authorization server. With a microservice architecture, you also need to track or correlate all activities across multiple services from frontend to backend. Such use case is a very good fit to use request interceptor - add 2 request interceptors, one to handle bearer token exchange and header injection and another to create a correlation context.

The following is an example how you can add 3 request interceptors **A**, **B**, **C** to a fetch request:

```
let response = await fetch
    .with(new A())
    .with(new B())
    .with(new C())
    ("https://some-api.somedomain.com", { method: 'GET', mode: 'cors' });
```
> NOTE: Request interceptor must be an instance of `BaseInterceptor` class. We'll talk more about `BaseInterceptor` when we cover the topic of "**Developing your own request interceptor**" below.

### Built-in request interceptors
---
The library comes with **2 request interceptors**:

`Timing`

Record total time elapsed (milliseconds) of the request. The time elapsed can be returned to the caller for logging purpose.

Example:

```
import { Timing } from '@appzmonster/fetch-interceptor';

...
let product = null;
let productId = 123456;
let fetchProductTiming = new Timing();
let response = await fetch
    .with(fetchProductTiming)
    (`https://mystore.appzmonster.com/products/{productId}`,
    { method: 'GET' });
if (response.ok)
{
    product = await response.json();
}
console.log(`[getProduct] Get product took ${fetchProductTiming.elapsed()} millisecond(s)`, product);
```


`MockRequest`

Simulate fetch request and return a mock response that you specify. It also supports response delay (delay for N number of milliseconds before returning the response) and response status code (e.g. HTTP 200, 400...etc.). `MockRequest` is very useful when you want to code without the dependency of a service API. When you're ready to intergrate with the actual service API, simply remove the MockRequest interceptor from the fetch request.

Example:

```
let response = await fetch
    .with(new MockRequest({
                delay: 1000, // Milliseconds to delay the response.
                data: { userId: 11, name: 'appzmonster' },
                dataType: 'application/json', // HTTP content type (e.g. application/xml)
                ok: false, // true, false
                status: 400, // HTTP response status code (e.g. 200, 404, 403)
                statusText: 'Bad Request' // HTTP response status code (e.g. 'OK', 'Bad Request')
            }))
            (
                "https://weather-api.accuweather.com", {
                method: 'GET'
            });
```

The `data` property of a `MockRequest` argument is the only mandatory property you must set. The following is the **default value** of a `MockRequest` argument:

```
{
    data: null,
    dataType: 'application/json', // Default is json content type.
    delay: 1000, // Delay for 1 second by default.
    ok: true, // For Response.ok - true or false.
    status: 200,
    statusText: 'OK'
}
```

### Developing your own request interceptor
---

The main intention of the fetch-interceptor library is to allow you to develop your own request interceptor based on your requirement. The library provides the `BaseInterceptor` class for you to extend and develop your request interceptor.

Let's walk through the development of a simple request interceptor use case. Assuming you need to develop a mechanism to track / correlate all activities (events / actions) of a trasaction starting from frontend to backend and record these activities to application logs. Typically we call this concept as "[correlation](https://www.oreilly.com/library/view/building-microservices-with/9781785887833/1bebcf55-05bb-44a1-a4e5-f9733b8edfe3.xhtml)" which will make use of an unique transaction id typically call "Correlation id" assigning the unique id to each and every request starting from frontend to the backend (backend may consists of multiple services in a typical microservice architecture). - This is a good fit use case for request interceptor.

>NOTE: The following example uses ES6 class syntax. You can use prototype inheritance style if you do not want to use ES6 class. Personally i recommended using ES6 class instead of prototype inheritance style.

(1) Start by creating a class and extend from `BaseInterceptor`.

**./src/CorrelationId.js**
```
import { BaseInterceptor } from '@appzmonster/fetch-interceptor';
class CorrelationId extends BaseInterceptor
{
    ...
}

export default CorrelationId;
```

(2) Next, create a constructor with 3 arguments; 
1. `logger` argument variable to store the logger object to send activity to application logs.
2. `activityName` argument variable to store the name of the activity (e.g. getUser). 
3. `generateCorrelationId` argument variable to store a function to generate the unique id for our correlation context. You can use NPM package such as [uuidv4](https://www.npmjs.com/package/uuidv4) to generate such id for example.

```
class CorrelationId : extends BaseInterceptor
{
    constructor(logger, activityName, generateCorrelationId)
    {
        super();

        this._logger = logger;
        this._activityName = activityName;
        this._generateCorrelationId = generateCorrelationId;
        if (typeof (this._generateCorrelationId) !== 'function')
        {
            throw new Error('[CorrelationIdInterceptor] Argument generateCorrelationId is not a function type');
        }
    }
    ...
}

export default CorrelationId;
```

(3) Next, override the `async invoke` function of the `BaseInterceptor` class. Within the function, you will invoke the `async fetch` function of the base class (`super.fetch`) and return its response. The `async invoke` function is invoked when the request interceptor is activated.

```
class CorrelationId :extends BaseInterceptor
{
    
    //
    // Code omitted for brevity
    //
    
    ...

    async invoke(resource, init)
    {
        // You can manipulate the resource and init here.

        // Pass the manipulated resource and init to the next 
        // request interceptor or send out the request.
        return await super.fetch(resource, init);
    }
}

export default CorrelationId;
```

Code something like below to generate the unique id for the correlation context and inject it as a header to the request. For this to work, the backend must agree to recognize the header (by header name) as the correlation context and uses the unique id value from the header.

```
class CorrelationId :extends BaseInterceptor
{
    
    //
    // Code omitted for brevity
    //
    
    ...

    async invoke(resource, init)
    {
        // Generate correlation id and convert to string.
        const correlationIdStr = this._generateCorrelationId() + "";

        try
        {
            // Inject correlation id as header to request.
            init.headers = Object.assign({}, init.headers, { 'X-CorrelationId' : correlationIdStr });
            
            // Trace the activity.
            this._logger.trace(`[${this._activityName}] (${correlationIdStr}) Sending request to '${resource}'`, init);

            let response = await super.fetch(resource, init);

            // You can do any response processing here.

            return response;
        }
        catch(error)
        {
            // Log the activity error.
            this._logger.error(`[${this._activityName}] (${correlationIdStr}) Request '${resource}' encounters error`, error);
            throw error;
        }
        finally
        {
            this._logger.trace(`[${this._activityName}] (${correlationIdStr}) Request '${resource}' is successful`);
        }
    }
}

export default CorrelationId;
```

(4) Construct the request with the `CorrelationId` request interceptor.

**./src/Home.js**
```
import CorrelationId from './CorrelationId';
import { useLogger } from './someLogger'; // Assuming we have some third party logger.
import { uuid } from 'uuidv4'; // Assuming we use uuidv4 to generate unique id.

...

const getUser = async (userId) => {
    // Assuming logger is injected here for use.
    const logger = useLogger();

    let response = await fetch
        .with(new CorrelationId(logger, 'getUser', () => uuid()))
        (`https://mystore.appzmonster.com/users/${userId}`, { method: 'GET' });

    ...
};
```

## Additional notes
---

### 1. Fluent API Design ###

[Fluent API](https://en.wikipedia.org/wiki/Fluent_interface) design principle is a good fit for this library because it allows the code to clearly shows the chaining of multiple request interceptors. Such clarity helps developer to easily identify the execution sequence of the request interceptors.


### 2. Non-intrusive Fetch API extension ###

This library does not wrap or modify the working mechanism of [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) but instead chosen an non-intrusive extension approach. A new `with ` property is attached to the `window.fetch` and all library code is encapsulated with the `with` property. Original Fetch API remains untouched.


### 3. 100% Compatibility with Fetch API ###

If you are already using Fetch API, they will work 100% with or without request interceptors. You do not need to forcibly use request interceptor for all Fetch API requests. You are given the freedom to selectively apply request interceptor to selected Fetch API request. Due to this compatibility, you can slowly introduce request interceptor in your application without worrying of breaking changes.


## License
---
Copyright (c) 2021 Jimmy Leong (Github: appzmonster). Licensed under the MIT License.