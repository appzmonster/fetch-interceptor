# Fetch-interceptor

Fetch-interceptor is a JavaScript library to enable request interceptor feature on [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). The library extends Fetch API and uses [fluent API](https://en.wikipedia.org/wiki/Fluent_interface) design to allow chaining of one or multiple request interceptors to a Fetch API request.

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
Request interceptor is a function that is invoked during an in-flight (outgoig) request and is designed to intercept a request to perform additional processing before the request is sent and after the request returns. A request interceptor can add or modify a request header before the request is sent or transform a request response from xml to json. One or multiple request interceptors can also be chained together to work on a request. This is very useful in use case where you need to perform certain action and pass the result of the action to the next interceptor in a request.

In short, a request interceptor enables the application to do additional action (intercept) before and after a request.


## Prerequisites
The library extends [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and expects the browser supports Fetch API. The library does not include polyfill to enable Fetch API. You are responsible to include any polyfill for browser that doesn't support Fetch API by default.


## Installation
Fetch-interceptor is available as NPM package.

```
npm install @appzmonster/fetch-interceptor
```


## Usage
You can start using fetch-interceptor by enabling it globally in your JavaScript application.

```
import { initialize } from '@appzmonster/fetch-interceptor';
initialize();
```

Typically, you'll code the above in `./index.js` or any JavaScript file that you use as the entry point to your application. Also, take note that you just need to invoke `initialize()` function once per application lifecycle. The `initialize()` function will check if `'fetch'` exist in the `window` object and do necessary extension.

>NOTE: Invoking `initialize()` multiple times does not throw error or produce any undesirable side effect.


### Enable Request Interceptor in a Fetch Request
In order to use request interceptor in a fetch request, you have to add the request interceptor to the fetch request via the `with` function: 

Using async / await:
```
let response = await fetch.with(/*request interceptor here*/)("https://some-api.somedomain.com", { method: 'GET', mode: 'cors' });
```

Using promise
```
fetch.with(/*request interceptor here*/)("https://some-api.somedomain.com", { method: 'GET', mode: 'cors' }).then(...
```

You can add one or multiple request interceptors to a request. **When multiple request interceptors are added (chained together)**, these request interceptors get invoked in a **specific order**:

> ***When a request is outgoing***, the first added request interceptor executes first and the last added interceptor executes last. The [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) arguments, `resource` and `init` is passed to the first added request interceptor for processing or modification. The first request interceptor can modify these arguments, do some additional actions and continue passing these arguments to the next request interceptor. This process continues until there is no more request interceptor down the line. After all request interceptors have executed their work, the request is sent out to the `resource` (usually a service API uri) using the arguments provided by the last request interceptor. For example, if you add 2 request interceptors **A** and **B**, assuming **A** interceptor adds a "`X-DataExpiry`" header to the request, when the second **B** interceptor is invoked, it inherits the "`X-DataExpiry`" header added by previous **A** interceptor. **B** interceptor can overwrite the "`X-DataExpiry`"header from **A** if it needs to and do any other processing.

> ***When a request returns***, the request interceptors are invoked in the **reverse order**. Using the same example above (**A** and **B**), the second **B** interceptor gets invoked first follows by **A** interceptor. In this case, if **B** interceptor modifies the response,  **A** interceptor will receive **B** response when it is invoked and return this modified response to the caller.

Chaining multiple request interceptors creates a very powerful fetch request. For example, in a typical [OAuth 2.0](https://oauth.net/2/pkce/) and [Microservice](https://microservices.io/) use case, very often you need to send a request with a bearer token which you exchange with an authorization server right before you initiate the request. With a microservice architecture, you also need to track or correlate all activities across multiple services from frontend to backend. Such use case is a good fit to use or chain multiple request interceptors - add 2 request interceptors, one to handle bearer token exchange plus header injection and another interceptor to create a correlation context that gets sent from frontend to all backend microservices.

The following is an example how you can add / chain 3 request interceptors **A**, **B**, **C** to a fetch request:

```
let response = await fetch
    .with(new A())
    .with(new B())
    .with(new C())
    ("https://some-api.somedomain.com", { method: 'GET', mode: 'cors' });
```
> NOTE: Request interceptor must be an instance of `BaseInterceptor` class. We'll talk more about `BaseInterceptor` when we cover the topic of "**Developing your own request interceptor**" below.

### Using Built-in Request Interceptors
The library comes with only **2 request interceptors** by default:

`Timing`

Record total time elapsed (milliseconds) of a request. The time elapsed can be returned to the caller for logging purpose.

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

Simulate fetch request and return a mock response that you specify. It also supports response delay (delay for N number of milliseconds before returning the response) and response status code (e.g. HTTP 200, 400...etc.). `MockRequest` is very useful when you want to code without the dependency of a service API. When you're ready to intergrate with the actual service API, simply remove the `MockRequest` interceptor from the fetch request.

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

### Developing Your Own Request Interceptor
The main intention of this fetch-interceptor library is to allow you to develop your own request interceptor based on your requirement. The library provides a `BaseInterceptor` class for you to develop your request interceptor.

Let's try to walkthrough a possible request interceptor use case - assuming you need to develop a mechanism to track / correlate all activities (events / actions) of a transaction starting from frontend to backend and record these activities to application logs. Typically we call this concept as "[correlation](https://www.oreilly.com/library/view/building-microservices-with/9781785887833/1bebcf55-05bb-44a1-a4e5-f9733b8edfe3.xhtml)" and we need an unique transaction id typically call "Correlation id" to circulate among the services, starting from frontend to the backend (backend may consists of multiple services).

>NOTE: The following example uses ES6 class syntax. You can use prototype inheritance style if you do not want to use ES6 class. Personally i recommended using ES6 class instead of prototype inheritance style for class development.

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
1. `logger` argument to store a logger object. The logger object will send activity to application logs.
2. `activityName` argument to store the name of the activity (e.g. getUser). 
3. `generateCorrelationId` argument to store a function to generate the unique id for our correlation context. You can use NPM package such as [uuidv4](https://www.npmjs.com/package/uuidv4) for this.

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

(3) Next, override the `async invoke` function of the `BaseInterceptor` class. Inside the `async invoke` function, you need to invoke the `async fetch` function of the base class (`super.fetch`) and return its response. This `async invoke` function is invoked when the request interceptor gets to execute (activated) in an in-flight request.

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

The below sample logic generates an unique id for the correlation context and injects it as a header to the request. For this to work, the backend service must agree to recognize the header (by header name) as the correlation context and uses the value from the header as its correlation id.

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

(4) Construct the fetch request with your `CorrelationId` request interceptor.

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

That's all you need to develop your very own request interceptor. You can then use it anytime you want in any fetch request moving forward.

## Additional notes
### 1. Fluent API Design
[Fluent API](https://en.wikipedia.org/wiki/Fluent_interface) design principle is a good fit for this library because it allows the code to clearly shows the chaining of multiple request interceptors. Such clarity helps developer to easily identify the execution sequence of the request interceptors.


### 2. Non-intrusive Fetch API Extension
This library does not wrap or modify the working mechanism of [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) but instead chosen an non-intrusive extension approach. A new `with ` property is attached to the `window.fetch` and all library code is encapsulated inside the `with` function. Original Fetch API remains untouched.


### 3. 100% Compatibility with Fetch API
If you are already using Fetch API, they will work 100% with or without request interceptors. You do not need to forcibly use request interceptor for all your Fetch API requests. You are given the freedom to selectively apply request interceptor to selected Fetch API request. Due to this compatibility, you can slowly introduce request interceptor in your application without worrying of breaking changes.

### 4. Class Design of `BaseInterceptor` Allows Constructor Dependency Injection
You can design your request interceptor to use external dependency object (e.g. logger) and inject these objects to the request interceptor via the constructor.


## License
Copyright (c) 2021 Jimmy Leong (Github: appzmonster). Licensed under the MIT License.