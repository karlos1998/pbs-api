/**
 * Created by Karol Sójka
 * www.letscode.it
 * kontakt@letscode.it
 * Last update: 31.10.2021
 * **/


/** --------- * MODULES  * --------- **/

/* Webbrowser */
const puppeteer = require('puppeteer');

/* Webserver */
const app = require("express")();

/* CORS header (request from other domains) */
var cors = require('cors');
app.use(cors());

/* Read/Write file */
const fs0 = require('fs');
const fs = require('fs').promises;

/* POST Data */
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

/* Crypto login & password in cookie file name */
const crypto = require("crypto");
const sha256Hasher = crypto.createHmac("sha256", "SECRET_KEY_LCI");
/** --------- * ^^^  * --------- **/


/* Puppeteer arguments */
const launch_args = {
    executablePath: '/usr/bin/google-chrome',
    //headless:false,
    args: [
        '--no-sandbox',
        //'--disable-setuid-sandbox',
    ]
};

/* Local Variables */

var browser;
var pages = {};

/*    ^^^    */

class Cookies {
    static cookie_dir_path = "cookies/";
	static async Restore(cookie_file_path) {
		try {
	        if (fs0.existsSync(this.cookie_dir_path + cookie_file_path)) {
	            const cookiesString = await fs.readFile(this.cookie_dir_path + cookie_file_path);
	            const cookies = JSON.parse(cookiesString);
	            console.log('restore cookies ---> ', cookies);
	            return cookies;
	        } else {
	            return false;
	        }
	    } catch (err) {
	        return false;
	    }
	}
	static async Save(cookie_file_path, cookies) {
		//console.log(JSON.stringify(cookies, null, 2));
		await fs.writeFile(this.cookie_dir_path + cookie_file_path, JSON.stringify(cookies, null, 2));
	}
}

let Errors = {
    PostData: function() {
        this.name = 'PostData';
        this.message = 'You need send login and password on POST data';
        this.code = 'OWN_ERROR_CODE';
    },
    LoginFailed: function() {
        this.name = 'LoginFailed';
        this.message = 'A problem occurred during a login attempt';
        this.code = 'OWN_ERROR_CODE';
    },
    SomethingIsWrong: function() {
        this.name = 'Problem';
        this.message = 'Something has gone wrong';
        this.code = 'OWN_ERROR_CODE';
    }
}

class Utils {
    static CheckLoginPostData(body) {
        var R = typeof body.login == 'string' && body.login.length > 0 && typeof body.password == 'string' && body.password.length > 0
        console.log(body);
        if (!R) {
            throw new Errors.PostData();
        }
        return true;
    }
    static async PageHtmlContains(page, t) {
		return (await (await (await page.$("body")).getProperty('textContent')).jsonValue()).indexOf(t) >= 0;
	}
	static async PanelHeadingContains(page, txt) {
		var headerTitle = await page.$eval(".panel > .panel-heading", el => el.textContent);
		return headerTitle.indexOf(txt) >= 0;
	}
}



class PBS_Client {
    constructor(login, password) {
        this.login = login;
        this.password = password;
        this.uniqueidx = login + "_" + password;
        console.log(this.uniqueidx);

        //await this.UseBrowserWindow();
    }

    async UseBrowserWindow() {
		if (typeof pages[this.uniqueidx] == 'undefined') {
			console.log('! New page.');
			this.page = await browser.newPage();

			var ck = await Cookies.Restore(this.CookieName);
			//console.log(ck);
			if(ck && ck.length > 0) await this.page.setCookie(...ck);

			pages[this.uniqueidx] = this.page;
		} 
		else {
			this.page = pages[this.uniqueidx];
			console.log("Using esixt page.")
		}
    }

    get CookieName() {
        const val = sha256Hasher.update(this.login + "_" + this.password).digest("hex");;
        console.log("cookie_" + val + ".json");
    	return "cookie_" + val + ".json";
    }

    async Login(sendVerifiSms) {
    	await this.UseBrowserWindow();

    	let f = new Login(this.page, this.login, this.password);
    	var r = await f.Init(sendVerifiSms);

    	console.log('login result: ');
    	console.log(r);

    	return r;
    }

    async WriteSmsCode(pin) {
    	await this.UseBrowserWindow();

    	await this.page.screenshot({path: 'photos/obrazek-' + Date.now() + '-pincode1.png'}); //TEST

    	
		try {
			if(await Utils.PanelHeadingContains(this.page, 'Zaufane urządzenie')) {
	    		await this.page.$eval('#smsPass', (textarea, text) => textarea.value = text.substring(0, text.length), pin);
	            await this.page.$eval('input[value="Zatwierdź"]', button => button.click());
	            await this.page.waitForTimeout(2000);

	            await this.page.screenshot({path: 'photos/obrazek-' + Date.now() + '-pincode2.png'}); //TEST

	            /* TODO 
	            sprawdzac czy wpisany pin jest poprawny
	            */
	            return 1;
            } else return -1;

    	} catch (e) {
    		console.log(e);
    		console.log("------------------------------------> OWN ERROR:")
    		throw new Errors.SomethingIsWrong();
    	}

    	return -2;
    }

    async GetData() {

    	try {

    		await this.UseBrowserWindow();

    		await this.page.screenshot({path: 'photos/obrazek-' + Date.now() + '-getdata.png'}); //TEST

    		if(!(await Login.IsLoggedIn(this.page))) throw new Errors.LoginFailed();

			var acc = await this.page.$$eval("#content-sidebar>summary-rach>ul>li.list-group-item", els => {
	    		return els.map(el => el.innerText.split('\n'))
	    	});

            var v = {};
            for(var i of acc) {
                v[i[0].normalize('NFKD').replace(/[^\w\s]/g, '').toLowerCase().replace(/[ \t\n\r]/g, '_')] = {
                    "key": i[0],
                    "val": !!i[1] ? i[1].replace(' PLN', '').replace(',', '.').replace(' ', '') : ''
                }
            }
	    	return {
	    		list: acc,
                object: v
	    	}

    	} catch (e) {
    		console.log(e);

    		if (e.code == "OWN_ERROR_CODE")
    			throw e;
    		else
    			throw new Errors.SomethingIsWrong();
    	}
    }


    async GetPrintScreen() {

    	try {

    		await this.UseBrowserWindow();

    		if(!(await Login.IsLoggedIn(this.page))) throw new Errors.LoginFailed();

    		await this.page.setViewport({
				width: 1200,
				height: 1440,
			});
			await this.page.goto('https://ebn.bankpbs.pl/showHistoriaRachunki', {
            	waitUntil: 'domcontentloaded'
        	});

			await this.page.waitForTimeout(5000); //TEST

			const n = 'AccountHistoryScreen-' + Date.now() + '.png';

			await this.page.screenshot({path: 'photos/' + n});

			const contents = fs0.readFileSync('photos/' + n, {encoding: 'base64'});			

            await this.page.goto('https://ebn.bankpbs.pl/', {
                waitUntil: 'domcontentloaded'
            });

            console.log('------------------------------------');
            console.log(contents);
            console.log('------------------------------------');

            fs0.writeFileSync('photos/' + n + '.txt', contents);

	    	return {
	    		base64: contents,
	    		size: contents.length,
                name: n 
	    	}

    	} catch (e) {
    		console.log(e);

    		if (e.code == "OWN_ERROR_CODE")
    			throw e;
    		else
    			throw new Errors.SomethingIsWrong();
    	}
    }

    async End() {
    	console.log('end client: save cookie');
    	//console.log(this.CookieName, await this.page.cookies());

    	await this.page.waitForTimeout(200); //TEST

    	await Cookies.Save(this.CookieName, await this.page.cookies());
    }

}

class Login  {
	constructor(page, login, password) {
		this.page = page;
		this.login = login;
		this.password = password;
	}
	async OpenDefaultPage() {

		await this.page.goto('https://ebn.bankpbs.pl/', {
            waitUntil: 'domcontentloaded'
        });

        await this.page.waitForTimeout(700); //TEST
        await this.page.screenshot({
            path: 'photos/obrazek-' + Date.now() + '-start.png'
        });
	}

	async IsLoggedIn() {
		//return (await (await (await this.page.$("body")).getProperty('textContent')).jsonValue()).indexOf('Wyloguj') >= 0;
		return Login.IsLoggedIn(this.page);
	}

	static async IsLoggedIn(page) {
		console.log('isloggedin....'); //TEST
		//console.log((await (await (await page.$("body")).getProperty('textContent')).jsonValue())); //TEST
		return (await (await (await page.$("body")).getProperty('textContent')).jsonValue()).indexOf('Wyloguj') >= 0;
	}

	async Init(sendVerifiSms) {
		try {

			await this.OpenDefaultPage();

			await this.page.screenshot({path: 'photos/obrazek-' + Date.now() + '-szybkitest.png'}); //TEST
			if(!(await this.IsLoggedIn())) {
				if(await Utils.PageHtmlContains(this.page, "Akcja nie powiodła się")) {
					console.log("error -> akcja nie powiodla sie");
				} else if(Utils.PageHtmlContains(this.page, "Logowanie do systemu")) {
					await this.TypeLoginAndPass();
					if(await Utils.PanelHeadingContains(this.page, 'Nie rozpoznaliśmy tego urządzenia')) {
						if(sendVerifiSms) await this.AddToTrusted();
						return 0;
					} else if(await this.IsLoggedIn()) {
						return 2;
					} else return -2;
				} else {
					console.log('error: cos poszlo nie tak... ')
				}

			} else return 1;

		} catch (e) {
    		console.log(e);

    		if (e.code == "OWN_ERROR_CODE")
    			throw e;
    		else
    			throw new Errors.SomethingIsWrong();
    	}
		
		return -1;
	}
	async TypeLoginAndPass() {

		await this.page.screenshot({path: 'photos/obrazek-' + Date.now() + '-szybkitest222.png'}); //TEST

		await this.page.$eval('input[name="login"]', (textarea, text) => textarea.value = text.substring(0, text.length), this.login);
		await this.page.keyboard.press("Tab");
		await this.page.keyboard.type(this.password);
		await this.page.$eval('input[type="submit"]', button => button.click());
		await this.page.waitForTimeout(2000); //TEST

	}

	async AddToTrusted() {

		await this.page.$eval('a[href="/trustedDevicePage1"]', button => button.click());

		await this.page.$eval('input[name="trustedDeviceContainer.trustedDevice.name"]', (textarea, text) => textarea.value = text.substring(0, text.length), "By Karol from www.letscode.it (" + Date.now() + ")");

		await this.page.$eval('input[name="trustedDeviceContainer.addTrustedDevice"]', button => button.click());

		await this.page.$eval('#trustedDeviceForm_0', button => button.click());

		await this.page.waitForTimeout(700); //TEST
		await this.page.screenshot({path: 'photos/obrazek-' + Date.now() + '-WHAT1.png'}); //TEST

		await this.page.$eval('#sendSMSBtn', button => button.click());
	}

}

(async () => {

    app.listen(9981, async () => {
        console.log('App started listening');

        app.get('/', (req, res, next) => {
            res.type('text/plain');
            res.send("ok");
        });


        browser = await puppeteer.launch(launch_args);


        app.post('/try_login', async (req, res, next) => {

            var writeError = null;
            var return_data = {};

            try {
                Utils.CheckLoginPostData(req.body);

                let Client = new PBS_Client(req.body.login, req.body.password);

                var r = return_data['login_status'] = await Client.Login();

                if(r<0) throw new Errors.LoginFailed();

                await Client.End();
                

            } catch (e) {
                console.log(e.name);
                console.log(e.message);
                console.log(e.code);
                if (e.code == "OWN_ERROR_CODE") {
                    writeError = {
                        name: e.name,
                        message: e.message
                    }
                }
            } finally {
                res.header('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    writeError: writeError,
                    return: true,
                    data: return_data
                }, null, 4));
            }


        });

        app.post('/login', async (req, res, next) => {

            var writeError = null;
            var return_data = {};

            try {
                Utils.CheckLoginPostData(req.body);

                let Client = new PBS_Client(req.body.login, req.body.password);

                var r = return_data['login_status'] = await Client.Login(true);

                if(r<0) throw new Errors.LoginFailed();

                await Client.End();
                

            } catch (e) {
                console.log(e.name);
                console.log(e.message);
                console.log(e.code);
                if (e.code == "OWN_ERROR_CODE") {
                    writeError = {
                        name: e.name,
                        message: e.message
                    }
                }
            } finally {
                res.header('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    writeError: writeError,
                    return: true,
                    data: return_data
                }, null, 4));
            }


        });

        app.post('/sms_code', async (req, res, next) => {

        	/* TODO 
			Dodac catch, zrobic sprawdzanie czy pin to int
        	*/

        	var writeError = null;
            var return_data = {};

        	try {
	        	Utils.CheckLoginPostData(req.body);

	        	let Client = new PBS_Client(req.body.login, req.body.password);
	        	return_data['sms_code_status'] = await Client.WriteSmsCode(req.body.pin);
	        	await Client.End();

            } catch (e) {
                console.log(e.name);
                console.log(e.message);
                console.log(e.code);
                if (e.code == "OWN_ERROR_CODE") {
                    writeError = {
                        name: e.name,
                        message: e.message
                    }
                }
            } finally {
                res.header('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    writeError: writeError,
                    return: true,
                    data: return_data
                }, null, 4));
            }


        });

        app.post('/get_data', async (req, res, next) => {


        	var writeError = null;
            var return_data = {};

        	try {
	        	Utils.CheckLoginPostData(req.body);

	        	let Client = new PBS_Client(req.body.login, req.body.password);
	        	return_data = await Client.GetData();
	        	await Client.End();

            } catch (e) {
                console.log(e.name);
                console.log(e.message);
                console.log(e.code);
                if (e.code == "OWN_ERROR_CODE") {
                    writeError = {
                        name: e.name,
                        message: e.message
                    }
                }
            } finally {
                res.header('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    writeError: writeError,
                    return: true,
                    data: return_data
                }, null, 4));
            }


        });


        app.post('/get_print_screen', async (req, res, next) => {


        	var writeError = null;
            var return_data = {};

        	try {
	        	Utils.CheckLoginPostData(req.body);

	        	let Client = new PBS_Client(req.body.login, req.body.password);
	        	return_data = await Client.GetPrintScreen();
	        	await Client.End();

            } catch (e) {
                console.log(e.name);
                console.log(e.message);
                console.log(e.code);
                if (e.code == "OWN_ERROR_CODE") {
                    writeError = {
                        name: e.name,
                        message: e.message
                    }
                }
            } finally {
                res.header('Content-Type', 'application/json');
                res.send(JSON.stringify({
                    writeError: writeError,
                    return: true,
                    data: return_data
                }, null, 4));
            }


        });

        app.get('*', function(req, res){
            res.status(404).send({"writeError":"page not found"});
        });

    });
})();