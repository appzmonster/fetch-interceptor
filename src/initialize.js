import BaseInterceptor from './BaseInterceptor';

class InvokeFetch extends BaseInterceptor
{
    constructor(fetch)
    {
        super();

        // Set the fetch function to execute in the context of window instead of
        // instance of OutboundFetch (e.g. the "this" in fetch is set to window instead 
        // of instance of OutboundFetch). This is required to prevent browser from 
        // complaining illegal invocation of fetch.
        this._fetch = fetch.bind(window);
    }

    async invoke(resource, init)
    {
        return await this._fetch(resource, init);
    }
}

function initialize()
{
    if ('fetch' in window)
    {
        if (('with' in window.fetch) === true)
        {
            if (typeof (window.fetch.with) !== 'function')
            {
                console.error('Unable to add interceptor feature to fetch on \'with\' property because \'with\' property is already in used');
                return;
            }
            return;
        }

        var fetch = window.fetch;
        
        /*
            The following function is designed in such a way so that it can chain a list of 'with' interceptors
            and finally invoke as a function.
            Example:
                fetch
                    .with(new A())
                    .with(new B())("http://file-api.appzmonster.com", {
                    method: 'GET',
                    mode: 'cors'    
                });
        */
        function FetchManager(interceptor)
        {
            if ((interceptor instanceof BaseInterceptor) === false)
            {
                throw new Error('Interceptor must extend from BaseInterceptor class');
            }

            this._interceptors = [].concat(interceptor);

            const fetchRequest = async (resource, init) =>
            {
                if (this._interceptors.length > 0)
                {
                    /*
                        Sample of interceptors:
                        A, B, C
                        Iteration (index = 2): interceptor = C
                        Iteration (index = 1): interceptor = C, B.setNextInterceptor(C), interceptor = B
                        Iteration (index = 0): interceptor = B, A.setNextInterceptor(B), interceptor = A
                    */
                    let i = 0;
                    let interceptor = null;
                    let interceptors = this._interceptors.concat(new InvokeFetch(fetch));
                    for (i = (interceptors.length - 1); i >= 0; i--)
                    {
                        if (interceptor != null)
                        {
                            interceptors[i]._setNextInterceptor(interceptor);
                        }
                        interceptor = interceptors[i];
                    }

                    if (interceptor != null)
                    {
                        return await interceptor.invoke(resource, init);
                    }
                    else
                    {
                        return null;
                    }
                }
                else
                {
                    return await fetch(resource, init);
                }
            };

            fetchRequest.with = (interceptor) => 
            {
                if ((interceptor instanceof BaseInterceptor) === false)
                {
                    throw new Error('Interceptor must extend from BaseInterceptor class');
                }

                this._interceptors.push(interceptor);
                return fetchRequest;
            };

            return fetchRequest;
        }

        fetch.with = (interceptor) => 
        {
            return new FetchManager(interceptor);
        };
    }
}

export default initialize;