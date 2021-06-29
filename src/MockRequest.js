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
            statusText: 'OK'
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

                if (this._mock.ok === true)
                {
                    resolve(mockResponse);
                }
                else
                {
                    reject(mockResponse);
                }
            }, this._mock.delay);
        });

        return promise;
    } 
}

export default MockRequest;