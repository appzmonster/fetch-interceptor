class BaseInterceptor
{
    constructor()
    {
        this._nextInterceptor = null;
    }

    _setNextInterceptor(interceptor)
    {
        this._nextInterceptor = interceptor;
        return;
    }

    async fetch(resource, init)
    {
        return await this._nextInterceptor.invoke(resource, init);
    }

    async invoke(resource, init)
    {
        throw new Error('Did not override intercept function to provide implementation');
    }
}

export default BaseInterceptor;
