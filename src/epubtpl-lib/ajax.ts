import fs = require('fs-extra');
import fetch = require('isomorphic-fetch');
import path = require('upath2');
import { IFiles } from '../config';
import fileType = require('file-type');
import { hashSum } from '../lib/util';
import imagemin = require('imagemin');
import imageminJpegtran = require('imagemin-jpegtran');
import imageminPngquant = require('imagemin-pngquant');
import imageminOptipng = require('imagemin-optipng');
import Bluebird = require('bluebird');
import BluebirdCancellation from 'bluebird-cancellation';
import { TimeoutError } from 'bluebird';

export { fetch }

/**
 * 處理附加檔案 本地檔案 > url
 */
export async function fetchFile(file: IFiles, ...argv)
{
	let _file;
	let err;

	if (file.data)
	{
		_file = file.data;
	}

	let is_from_url: boolean;

	if (!_file && file.file)
	{
		_file = await fs.readFile(file.file);
	}

	if (!_file && file.url)
	{
		_file = await fetch(file.url, ...argv)
			.then(function (ret)
			{
				//console.log(file.name, ret.type, ret.headers);

				if (!file.mime)
				{
					let c = ret.headers.get('content-type');

					if (Array.isArray(c))
					{
						file.mime = c[0];
					}
					else if (typeof c === 'string')
					{
						file.mime = c;
					}
				}

				try
				{
					// @ts-ignore
					if (!file.name && !file.basename && ret.headers.raw()['content-disposition'][0].match(/filename=(['"])?([^\'"]+)\1/))
					{
						let filename = RegExp.$2;

						file.name = path.basename(filename);

						//console.log(file.name);
					}
				}
				catch (e)
				{

				}

				//console.log(ret.headers, ret.headers.raw()['content-disposition'][0]);
				//.getResponseHeader('Content-Disposition')

				// @ts-ignore
				return ret.buffer()
			})
			.then(buf =>
			{

				if (buf)
				{
					is_from_url = true;
				}

				return buf;
			})
			.catch(function (e)
			{
				is_from_url = false;

				err = e;

				return null;
			})
		;
	}

	if (_file)
	{
		const timeout = 5000;

		/**
		 * 如果此部分發生錯誤則自動忽略
		 */
		await Bluebird
			.resolve()
			.then(function ()
			{
				/**
				 * 只壓縮從網路抓取的 PNG 圖片
				 */
				let pngOptions: imageminPngquant.Options = {
					quality: is_from_url ? [0.65, 0.8] : undefined,
				};

				let pc = BluebirdCancellation
					.resolve(imagemin.buffer(_file, {
					plugins: [
						imageminOptipng(),
						imageminJpegtran(),
						// @ts-ignore
						imageminPngquant(pngOptions),
					],
				}))
				;

				return Bluebird.resolve(pc)
					.timeout(timeout)
					.tapCatch(TimeoutError, (e) => {
						console.error(`[ERROR] imagemin 處理時間過久 ${timeout}ms 放棄壓縮此圖片`)
						pc.cancel();
					})
			})
			.then(function (buf)
			{
				if (Buffer.isBuffer(buf))
				{
					_file = buf
				}
			})
			.catch(function (e)
			{
				console.error('[ERROR] imagemin 發生錯誤，本次將忽略處理此檔案', e.toString().replace(/^\s+|\s+$/, ''), file);
				//console.error(e);
			})
		;
	}

	if (!_file)
	{
		let e = err || new ReferenceError();
		e.data = file;

		throw e;
	}

	if (file.name && file.ext !== '')
	{
		file.ext = file.ext || path.extname(file.name);

		if (!file.ext)
		{
			file.ext = null;
		}
	}

	if (!file.ext || !file.mime)
	{
		let data = fileType(_file);

		if (data)
		{
			if (file.ext !== '')
			{
				file.ext = file.ext || '.' + data.ext;
			}

			file.mime = file.mime || data.mime;
		}
		else if (file.ext !== '')
		{
			file.ext = file.ext || '.unknow';
		}
	}

	if (!file.name)
	{
		file.name = (file.basename || hashSum(file)) + file.ext;
	}

	file.data = _file;

	return file;
}

export default fetch;
