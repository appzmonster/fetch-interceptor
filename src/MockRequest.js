import BaseInterceptor from './BaseInterceptor';

class MockRequest extends BaseInterceptor 
{
    constructor(mock) 
    {
        super();
        this._mock = Object.assign({}, {
            data: null,
            dataType: 'application/json',
            delay: 1000, // Delay for 1 second by default.
            ok: true, // For Response.ok - true or false.
            status: 200,
            statusText: 'OK',
            simulateNetworkError: false // To simulate request fail to complete, thus throwing error.
        }, mock);
    }

    async invoke(resource, init)
    {
        const promise = new Promise((resolve, reject) => 
        {
            setTimeout(() => 
            {
                let mockBlob = null;
                if (this._mock.dataType.toLowerCase() === 'application/json')
                {
                    mockBlob = new Blob(
                        [ JSON.stringify(this._mock.data) ], 
                        { type : this._mock.dataType });
                }
                else
                {
                    mockBlob = new Blob(
                        [ this._mock.data ],
                        { type: this._mock.dataType }
                    );
                }

                let mockResponse = new Response(mockBlob, 
                    { status : this._mock.status , statusText : this._mock.statusText });

                /*
                    Reference: MDN
                    The Promise returned from fetch() won’t reject on HTTP error status even 
                    if the response is an HTTP 404 or 500. Instead, as soon as the server responds 
                    with headers, the Promise will resolve normally (with the ok property of the 
                    response set to false if the response isn’t in the range 200–299), and it will 
                    only reject on network failure or if anything prevented the request from completing.
                */
                if (this._mock.simulateNetworkError === true)
                {
                    let networkError = new TypeError('Network request failed');
                    reject(networkError);
                }
                else
                {
                    // Resolve response even if it's an error because the request completed.
                    resolve(mockResponse);
                }
                
            }, this._mock.delay);
        });

        return promise;
    } 
}

export default MockRequest;