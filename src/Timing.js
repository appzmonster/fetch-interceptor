import BaseInterceptor from './BaseInterceptor';

class Timing extends BaseInterceptor
{
    constructor()
    {
        super();
        this._elapsed = null;
    }

    elapsed()
    {
        return this._elapsed;
    }

    async invoke(resource, init)
    {
        let startDate = null;
        let stopDate = null;

        this._elapsed = null;

        try
        {
            startDate = new Date();
            return await super.fetch(resource, init);
        }
        catch(error)
        {
            throw error;
        }
        finally
        {
            stopDate = new Date();
            this._elapsed = stopDate.getTime() - startDate.getTime();
        }
    }
}

export default Timing;