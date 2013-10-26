// <script type="text/html" data-template-name="blog/post_body">
// 	#{include blog/header}
//
// 	<h1>#{title}</h1>
// 	<p>#{body}</p>
// 	<ol>
// 		<li>#{render blog/post/comments with comments}</li>
// 	</ol>
//
// 	#{include blog/footer}
// </script>

function Template(name, source) {
	if (name) {
		this.name = name;
		this.setSource(source);
	}
}

Template.prototype = {

	name: null,

	source: null,

	subTemplatesFetched: false,

	constructor: Template,

	render: function render(data) {
		var source = this.source
			// #{include foo/bar}
			.replace(Template.REGEX_INCLUDE, function includeReplacer(tag, templateName) {
				return Template.find(templateName).render(data);
			})
			// #{render foo/bar foreach} (renders the template for each key in data)
			// #{render foo/bar foreach baz} (renders the template for each key in data.baz)
			.replace(Template.REGEX_FOREACH, function foreachReplacer(tag, templateName, dataKeyWithSpace, dataKey) {
				var renderData = (!dataKey) ? data : data[ dataKey ],
				    buffer = [],
				    i = 0,
				    length = renderData.length,
				    template = Template.find(templateName),
				    str, iteration, key;

				if (renderData instanceof Array) {
					for (i; i < length; i++) {
						iteration = (i % 2 === 0) ? "even" : "odd";

						buffer.push(
							template.render( renderData[i] )
								.replace(/#\{@loop.index\}/g, i)
								.replace(/#\{@loop.iteration\}/g, iteration)
						);
					}
				}
				else {
					i = 0;

					for (key in renderData) {
						if (renderData.hasOwnProperty(key)) {
							iteration = (i++ % 2 === 0) ? "even" : "odd";

							buffer.push(
								template.render( renderData[key] )
									.replace(/#\{@loop.index\}/g, key)
									.replace(/#\{@loop.iteration\}/g, iteration)
							);
						}
					}
				}

				str = buffer.join("");

				template = buffer = null;

				return str;
			})
			// #{render foo/bar} (uses data as the context)
			// #{render foo/bar with baz} (uses the object at data.baz as the context)
			.replace(Template.REGEX_RENDER, function renderReplacer(tag, templateName, withClause, dataKey) {
				var renderData = (!dataKey) ? data : data[ dataKey ];

				if (renderData instanceof Array) {
					var buffer = [],
					    i = 0,
					    length = renderData.length,
					    template = Template.find(templateName),
					    str, iteration;

					for (i; i < length; i++) {
						iteration = (i % 2 === 0) ? "even" : "odd";

						buffer.push(
							template.render( renderData[i] )
								.replace(/#\{@loop.index\}/g, i)
								.replace(/#\{@loop.iteration\}/g, iteration)
						);
					}

					str = buffer.join("");

					template = buffer = null;

					return str;
				}
				else {
					return Template.find(templateName).render( renderData );
				}
			})
			.replace(/#\{\s*([-\w.]+)\s*\}/g, function keyReplacer(tag, key) {
				return data.hasOwnProperty(key) ? data[key] : "";
			});

		data = null;

		return source;
	},

	setSource: function setSource(source) {
		if (typeof source === "string") {
			this.source = source;
		}
		else {
			this.source = source.innerHTML;
			this.name = source.getAttribute("data-template-name");
		}

		source = null;
	}

};

Template.REGEX_RENDER = /#\{\s*render\s+(.+?)(\s+with\s+(.*?)\s*)?\}/g;
Template.REGEX_INCLUDE = /#\{\s*include\s+(.+?)\s*\}/g;
Template.REGEX_FOREACH = /#\{\s*render\s+(.+?)\s+foreach(\s+([^\s}]+))?\s*\}/g;

Template.cacheBuster = new Date().getTime();

Template.document = window.document;

Template.templates = {};

Template.fetch = function fetch(name, context, callback) {
	if (Template.find(name)) {
		callback.call(context, Template.templates[name]);
	}
	else {
		var source = Template.getTemplateSourceNode(name);
		var url = source.getAttribute("data-src");
		var xhr;

		var cleanup = function() {
			context = callback = xhr = source = cleanup = null;
		};

		if (url) {
			url = url + (/\?/.test(url) ? "&" : "?") + "cacheBuster=" + Template.cacheBuster;
			xhr = new XMLHttpRequest();
			xhr.open("GET", url);
			xhr.onreadystatechange = function() {
				var success = (this.status === 201 || this.status === 200) ? true : false;

				if (this.readyState === 4 && success) {
					if (success) {
						Template.fetchSubTemplates(xhr.responseText, function() {
							Template.templates[name] = new Template(name, xhr.responseText);
							callback.call(context, Template.templates[name]);
							cleanup();
						});
					}
					else if (this.status === 403) {
						cleanup();
						throw new Error("Failed to fetch template from URL: " + url + ". Server returned 403 Not Authorized");
					}
					else if (this.status === 404) {
						cleanup();
						throw new Error("Failed to fetch template from URL: " + url + ". Server returned 404 Not Found.");
					}
					else if (this.status >= 400) {
						cleanup();
						throw new Error("Failed to fetch template from URL: " + url + ". Server returned an error (" + this.status + ")");
					}
				}
			};
			xhr.send(null);
		}
		else {
			Template.templates[name] = new Template(name, source);
			Template.fetchSubTemplates(source.innerHTML, function() {
				callback.call(context, Template.templates[name]);
				cleanup();
			});
		}
	}
};

Template.fetchSubTemplates = function fetchSubTemplates(source, callback) {
	var subTemplates = [], total, i = 0, count = 0;

	var handleTemplateFetched = function() {
		count++;

		if (count === total) {
			callback();
		}
	};

	source
		.replace(this.REGEX_FOREACH, function(tag, templateName) {
			subTemplates.push(templateName);
		})
		.replace(this.REGEX_RENDER, function(tag, templateName, dataKey) {
			subTemplates.push(templateName);
		})
		.replace(this.REGEX_INCLUDE, function(tag, templateName) {
			subTemplates.push(templateName);
		});

	total = subTemplates.length;

	if (total) {
		for (i = 0; i < total; i++) {
			Template.fetch(subTemplates[i], this, handleTemplateFetched);
		}
	}
	else {
		callback();
	}
};

Template.find = function find(name) {
	if (!Template.templates[name]) {
		var source = Template.getTemplateSourceNode(name);
		Template.templates[name] = new Template(name, source);
		source = null;
	}

	return Template.templates[name];
};

Template.getTemplateSourceNode = function getTemplateSourceNode(name) {
	var scripts = Template.document.getElementsByTagName("script"),
	    i = 0, source;

	for (i; i < scripts.length; i++) {
		if (scripts[i].getAttribute("data-template-name") === name) {
			source = scripts[i].innerHTML;
			break;
		}
	}

	if (!source) {
		throw new Error('Missing template ' + name + '. Required: <script type="text/html" data-template-name="' + name + '"></script>');
	}

	return source;
};

Template.parseHTML = function parseHTML(html) {
	var div = document.createElement("div")
	var nodes = [], i, length, node;

	div.innerHTML = html.replace(/^\s+|\s+$/g, "");
	i = div.childNodes.length;

	while (i--) {
		node = div.childNodes[i];
		node.parentNode.removeChild(node);
		nodes.push(node);
	}

	node = div = null;

	return nodes;
};

Template.register = function register(template) {
	Template.templates[ template.name ] = template;
};

Template.render = function render(name, data, context, callback) {
	Template.fetch(name, this, function(template) {
		var source = template.render(data);
		callback.call(context, source, template);
		data = context = callback = template = null;
	});
};
