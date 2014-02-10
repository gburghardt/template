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
	}

	if (source) {
		this.setSource(source);
	}
}

Template.REGEX_RENDER = /#\{\s*render\s+(.+?)(\s+with\s+(.*?)\s*)?\}/g;
Template.REGEX_INCLUDE = /#\{\s*include\s+(.+?)\s*\}/g;
Template.REGEX_FOREACH = /#\{\s*render\s+(.+?)\s+foreach(\s+([^\s}]+))?\s*\}/g;

Template.prototype = {

	name: null,

	source: null,

	viewResolver: null,

	constructor: Template,

	render: function render(data) {
		var viewResolver = this.viewResolver, source = this.source
			// #{include foo/bar}
			.replace(Template.REGEX_INCLUDE, function includeReplacer(tag, templateName) {
				return viewResolver.find(templateName).render(data);
			})
			// #{render foo/bar foreach} (renders the template for each key in data)
			// #{render foo/bar foreach baz} (renders the template for each key in data.baz)
			.replace(Template.REGEX_FOREACH, function foreachReplacer(tag, templateName, dataKeyWithSpace, dataKey) {
				var renderData = (!dataKey) ? data : data[ dataKey ],
				    buffer = [],
				    i = 0,
				    length = renderData.length,
				    template = viewResolver.find(templateName),
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
					    template = viewResolver.find(templateName),
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
					return viewResolver.find(templateName).render( renderData );
				}
			})
			.replace(/#\{\s*([-\w.]+)\s*\}/g, function keyReplacer(tag, key) {
				return data.hasOwnProperty(key) ? data[key] : "";
			});

		data = null;

		return source;
	},

	setSource: function setSource(source) {
		if (!source) {
			throw new Error("Missing required argument: source");
		}
		else if (typeof source === "string") {
			this.source = source;
		}
		else {
			this.source = source.innerHTML;
			this.name = source.getAttribute("data-template-name");
		}

		source = null;
	}

};
