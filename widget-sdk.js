
class IntelliWidgetConfig {
	/**
		* Represents the configuration of an IntelliProve Widget
		* @param {string} name - The name of the widget
		* @param {Object} config - The configuration for the widget
		* @param {string} variation - The variation to use
		* @param {Object} themeOverrides - Overrides for the theme
		* @param {string} baseURL - The base URL to use for fetching the widget
	*/

	constructor(name, config, variation, themeOverrides, baseURL, auth) {
		this.name = name;
		this.config = config;
		this.variation = variation;
		this.themeOverrides = themeOverrides;
		this.baseURL = baseURL;
		this.auth = auth;
	}
}


class IntelliWidget {
	/**
		* Represents a IntelliProve UI Widget.
		* @constructor
		* @param {string} widgetId - A unique id per widget type
		* @param {IntelliWidgetConfig} widgetConfig - configuration for the widget
	 */
	constructor(widgetId, widgetConfig) {
		this.widgetId = widgetId;
		this.widgetConfig = widgetConfig;

		this.innerContent = "";
		this.instances = [];
		this.headElements = [];
		this.bodyScripts = [];
		
		this.eventHandler = this.eventHandler.bind(this);
		window.addEventListener("message", this.eventHandler)
	}

	/**
		* Check if the widget has been fetched before
	*/
	fetched() {
		return this.innerContent !== "";
	}

	/**
		* Fetch the widgets contents, required before mounting
		* @param {string} [locale='en'] - Language for the widget
	*/
	async fetch(locale = 'en') {
		const myHeaders = new Headers();
		myHeaders.append("Content-Type", "application/json");
		myHeaders.append("Authorization", `Token ${this.widgetConfig.auth}`)

		const raw = JSON.stringify({
			"appearance": {
				"theme": this.widgetConfig.themeOverrides,
				"language": locale,
				"variation": this.widgetConfig.variation,
			},
			"data": this.widgetConfig.config,
		});

		const requestOptions = {
		  method: "POST",
		  headers: myHeaders,
		  body: raw,
		  redirect: "follow"
		};

		const response = await fetch(this.widgetConfig.baseURL + `/widgets/${this.widgetConfig.name}`, requestOptions);
		const result = await response.text();

		var container = document.createElement('div');
		container.innerHTML = result;
		
		const scripts = container.querySelectorAll('script');
		const styles = container.querySelectorAll('style');
		const links = container.querySelectorAll('link');

		var headElements = [];
		headElements = headElements.concat(Array.from(scripts).filter(s => s.src));
		headElements = headElements.concat(Array.from(styles));
		headElements = headElements.concat(Array.from(links));

		const bodyScripts = Array.from(scripts).filter(s => !s.src);
		const widgetContent = container.getElementsByClassName("intelli-widget")[0];

		this.headElements = headElements;
		this.bodyScripts = bodyScripts;
		this.innerContent = widgetContent;
	}

	/**
		* Mount this widget to an existing element using a selector
		* @param {string} selector - The query selector of the HTML element to target
	*/
	mount(selector) {
		console.log('mounting')
		const targetElem = document.querySelector(selector);
		if (!targetElem) {
			throw new Error(`No element found for selector '${selector}'!`)
		}
		
		if (!IntelliProveWidgets.loaded()) {
			throw new Error("IntelliProve widgets not loaded!");
		}

		if (this.instances.length === 0) {
			for (let i = 0; i < this.headElements.length; i++) {
				IntelliProveWidgets.injectHeadElement(this.headElements[i]);
			}
		}

		this.instances.push(selector);
		const uid = this.widgetId + '-' + this.instances.length.toString();
		const innerHTML = this.innerContent.outerHTML.replace('intelli-widget-id', uid);
		targetElem.innerHTML = innerHTML;

		for (let i = 0; i < this.bodyScripts.length; i++) {
			IntelliProveWidgets.injectBodyScript(this.bodyScripts[i], uid);
		}
	}

	/**
		* Update all mounted instances of this widget with new content
	*/
	updateAll() {
		const len = this.instances.length;
		for (let i = 0; i < len; i++) {
			try {
				this.mount(this.instances[i])
			} catch (e) {
				console.warn("Error while re-mounting existing widget: " + e)
			}
		}
	}

	/**
		* Removes all mounted instances of this widget
	*/
	removeAll() {
		const len = this.instances.length;
		for (let i = 0; i < len; i++) {
			try {
				const targetElem = document.querySelector(this.instances[i]);
				if (!targetElem)
					return

				targetElem.innerHTML = "";
			} catch (e) {
				console.warn("Error while re-mounting existing widget: " + e)
			}
		}
	}

	async eventHandler(event) {
		const data = event.data;
		if (typeof data !== 'object') 
			return;

		if (!('target' in data))
			return;

		if (data['target'] !== 'intelli-widgets')
			return;
		
		const messageKind = data['kind']
		switch (messageKind) {
			case "language":
				const locale = data['data']
				await this.fetch(locale)
				this.updateAll();
				break;

			case "clear":
				this.removeAll();
				break

			default:
				console.warn("Invalid intelli-widgets message" + event)
				break;
		}	
	}

}


class IntelliProveWidgets {
	/**
		* SDK for creating and managing IntelliProve UI Widgets
		* @constructor
		* @param {string} url - URL of intelliprove API
		* @param {string} action_token - Action token (Auth)
		* @param {string} locale - Language of widgets
	*/
	constructor(url, action_token, locale = 'en') {
		this.url = url;
		this.action_token = action_token;
		IntelliProveWidgets.load(url)

		this.locale = locale;
	}

	/** 
		* Generates a new id for HTML elements
		* @param {number} [length=8] - how long the unique part needs to be
	*/
	static newId(length = 8) {
		let id = 'intelli-widget-';
		const chars = 'abcdefghijklmnopqrstuvwxyz';
		for (let i = 0; i < length; i++) {
			id += chars.charAt(Math.floor(Math.random() * chars.length))
		}
		return id;
	}

	/*
		* check if Chart.JS has been loaded
	*/
	static chartJSLoaded() {
		return typeof Chart !== 'undefined';
	}
	
	/*
		* check if all the Chart.JS plugins have been loaded
	*/
	static chartJSPluginsLoaded() {
		return typeof ChartDataLabels !== 'undefined';
	}

	/**
		* Check if all required libraries are loaded
	*/
	static loaded() {
		return IntelliProveWidgets.chartJSLoaded() && IntelliProveWidgets.chartJSPluginsLoaded()
	}

	/**
		* Inject a script into the HTML head
		* @param {HTMLScriptElement} script - Script to inject
	*/
	static injectHeadScript(script) {
		const newScript = document.createElement("script");
		newScript.type = "text/javascript";
		newScript.src = script.src;
		document.head.appendChild(newScript);
	}

	/**
		* Inject a script into the HTML head
		* @param {HTMLLinkElement} linkElement - Link to inject
	*/
	static injectHeadLink(linkElement) {
		document.head.appendChild(linkElement);
	}

	/**
		* Inject a script into the HTML head
		* @param {HTMLStyleElement} styleElement - Style to inject
	*/
	static injectHeadStyle(styleElement) {
		document.head.appendChild(styleElement);
	}

	/**
		* Inject a Script, Link or Style element in the document head
		* @param {HTMLElement} element - element to inject into head
	*/
	static injectHeadElement(element) {
		switch (element.nodeName) {
			case "SCRIPT":
				IntelliProveWidgets.injectHeadScript(element);
				break;
			case "STYLE":
				IntelliProveWidgets.injectHeadStyle(element);
				break;
			case "LINK":
				IntelliProveWidgets.injectHeadLink(element);
				break;

			default:
				throw new Error("Invalid element type! Element must be one of: script, link, style");
		}
	}

	/**
		* Inject a script into the HTML document body
		* @param {HTMLScriptElement} script - Script to inject
		* @param {string | null} [replaceId=null] - Optional: if required, override the 'intelli-widget-it' with the provided id
	*/
	static injectBodyScript(script, replaceId = null) {
		const newScript = document.createElement("script");
		newScript.type = "text/javascript";
		let textContent = script.textContent;
		if (replaceId !== null) {
			textContent = textContent.replace('intelli-widget-id', replaceId);
		}

		newScript.textContent = textContent;
		document.body.appendChild(newScript);
	}

	/**
		* Inject a library or module
	*/
	static injectModule(uri, conditionCheck = null) {
		if (conditionCheck !== null && !conditionCheck()) {
			window.requestAnimationFrame(() => {IntelliProveWidgets.injectModule(uri, conditionCheck)})
			return;
		}
		const scriptTag = document.createElement('script');
		scriptTag.type = "module";
		scriptTag.src = uri
		document.head.appendChild(scriptTag);
	}

	/**
		* Load all required libraries and modules to run IntelliProve UI widgets
		* Check if required with 'loaded()'
	*/
	static load() {
		IntelliProveWidgets.injectModule("https://intelliprove-js-cdn-dev.s3.eu-west-1.amazonaws.com/chartjs.js")
		IntelliProveWidgets.injectModule("https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.js")
		IntelliProveWidgets.injectModule("https://intelliprove-js-cdn-dev.s3.eu-west-1.amazonaws.com/chartjs-plugin-datalabels.js", IntelliProveWidgets.chartJSLoaded)
	}

	/**
		* Change the default language and update all existing components
		* @param {string} locale - The language to use: 'en', 'nl', 'fr'
	*/
	changeLanguage(locale) {
		this.locale = locale
		window.postMessage({"target": "intelli-widgets", "kind": "language", "data": this.locale})
	}

	/**
		* Get a UI widget
		* @param {string} name - Name of the widget to get
		* @param {object} config - The configuration object for the specified widget
		* @param {string} [variation=""] - Optional: specify the variation of the widget
		* @param {{}} [themeOverrides={}] - Optional: theme overrides for this specific widget
	*/
	async getWidget(name, config, variation = "default", themeOverrides = {}) {
		const widgetConfig = new IntelliWidgetConfig(name, config, variation, themeOverrides, this.url, this.action_token);
		while (!IntelliProveWidgets.loaded()) {
			console.log("waiting")
			await new Promise(r => setTimeout(r, 50));
		}

		let widget = new IntelliWidget(IntelliProveWidgets.newId(), widgetConfig)
		await widget.fetch();

		return widget;
	}

	/**
		* Clear all widgets
	*/
	clear() {
		window.postMessage({"target": "intelli-widgets", "kind": "clear"})
	}
}

