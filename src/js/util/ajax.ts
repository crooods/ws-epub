namespace xhr
{
	// @ts-ignore
	export let x;

	// @ts-ignore
	if ((null, typeof XMLHttpRequest) !== 'undefined')
	{
		x = XMLHttpRequest;
	}
	// @ts-ignore
	else if ((null, typeof ActiveXObject) !== 'undefined')
	{
		x = ActiveXObject;
	}
	else
	{
		// @ts-ignore
		x = require("xmlhttprequest").XMLHttpRequest;
	}
}

import * as D from 'd.js';

export function ajax(url, data?): Promise<any>
{
	let deferred = D();

	try
	{
		let x = new (xhr.x)('MSXML2.XMLHTTP.3.0');
		x.open(data ? 'POST' : 'GET', url, 1);
		x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		x.onreadystatechange = function ()
		{
			x.readyState > 3 && deferred.resolve({ 'data': x.responseText, 'xhr': x });
		};
		x.send(data);
	}
	catch (e)
	{
		console.error(e);
		deferred.reject(e);
	}

	return deferred.promise;
}

export default ajax;
