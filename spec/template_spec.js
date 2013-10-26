describe("Template", function() {

	describe("find", function() {

		it("finds the template source in the document", function() {
			var script = document.createElement("script");
			script.setAttribute("type", "text/html");
			script.setAttribute("data-template-name", "test/find");
			script.innerHTML = '<p>I am a template!</p>';
			document.body.appendChild(script);
			var template = Template.find("test/find");
			expect(template instanceof Template).toBe(true);
			expect(Template.templates["test/find"]).toBe(template);
		});

		it("returns null when no template source exists in the document", function() {
			expect(function() {
				Template.find("test/non_existent")
			}).toThrowError();
		});

		it("returns an existing template instance", function() {
			var mockDocument = {
				querySelector: function() {}
			};
			var realDocument = Template.document;
			Template.document = mockDocument;
			spyOn(mockDocument, "querySelector");
			Template.templates["test/existing"] = new Template("test/existing", "I am a template");
			var template = Template.find("test/existing");
			Template.document = realDocument;
			expect(template).toBe(Template.templates["test/existing"]);
			expect(mockDocument.querySelector).not.toHaveBeenCalled();
		});

	});

	describe("initialize", function() {

		it("sets the source from a string", function() {
			var source = "I am a template";
			var template = new Template("test/initialize", source);
			expect(template.source).toEqual(source);
		});

		it("sets the source from a script tag", function() {
			var source = document.createElement("source");
			source.setAttribute("type", "text/html");
			source.setAttribute("data-template-name", "test/initialize_script_source");
			source.innerHTML = 'I am a template!';
			var template = new Template("abc", source);
			expect(template.source).toEqual(source.innerHTML);
		});

	});

	describe("REGEX_INCLUDE", function() {

		beforeEach(function() {
			var that = this;
			this.info = {};

			this.includeFunction = function(tag, templateName)  {
				that.info.tag = tag;
				that.info.templateName = templateName;
			};
		})

		it("should match a template name", function() {
			'#{include foo}'.replace(Template.REGEX_INCLUDE, this.includeFunction);

			expect(this.info.tag).toEqual('#{include foo}');
			expect(this.info.templateName).toEqual('foo');
		});

		it("should match a template name with forward slashes", function() {
			'#{include foo/bar}'.replace(Template.REGEX_INCLUDE, this.includeFunction);

			expect(this.info.tag).toEqual("#{include foo/bar}");
			expect(this.info.templateName).toEqual("foo/bar");
		});

		it("should match regardless of white space", function() {
			'#{ include   foo/bar }'.replace(Template.REGEX_INCLUDE, this.includeFunction);

			expect(this.info.tag).toEqual('#{ include   foo/bar }');
			expect(this.info.templateName).toEqual("foo/bar");
		});

	});

	describe("REGEX_RENDER", function() {

		beforeEach(function() {
			var that = this;
			this.info = {};

			this.replacerFunction = function(tag, templateName, withClause, dataKey) {
				that.info.tag = tag;
				that.info.templateName = templateName;
				that.info.withClause = withClause;
				that.info.dataKey = dataKey;

				return "";
			};
		});

		it("matches a template name with no data key", function() {
			"#{render foo}".replace(Template.REGEX_RENDER, this.replacerFunction);

			expect(this.info.tag).toEqual("#{render foo}");
			expect(this.info.templateName).toEqual("foo");
			expect(this.info.withClause).toEqual("");
			expect(this.info.dataKey).toEqual("");
		});

		it("matches a template name and a data key", function() {
			"#{render foo with bar}".replace(Template.REGEX_RENDER, this.replacerFunction);

			expect(this.info.tag).toEqual("#{render foo with bar}");
			expect(this.info.templateName).toEqual("foo");
			expect(this.info.withClause).toEqual(" with bar");
			expect(this.info.dataKey).toEqual("bar");
		});

		it("matches a template name with forward slashes", function() {
			"#{render foo/bar with baz}".replace(Template.REGEX_RENDER, this.replacerFunction);

			expect(this.info.tag).toEqual("#{render foo/bar with baz}");
			expect(this.info.templateName).toEqual("foo/bar");
			expect(this.info.withClause).toEqual(" with baz");
			expect(this.info.dataKey).toEqual("baz");
		});

		it("matches regardless of white space", function() {
			"#{  render	foo/bar  	with baz }".replace(Template.REGEX_RENDER, this.replacerFunction);

			expect(this.info.tag).toEqual("#{  render	foo/bar  	with baz }");
			expect(this.info.templateName).toEqual("foo/bar");
			expect(this.info.withClause).toEqual("  	with baz ");
			expect(this.info.dataKey).toEqual("baz");
		});

	});

	describe("REGEX_FOREACH", function() {

		beforeEach(function() {
			var that = this;

			this.info = {};

			this.foreachReplacer = function(tag, templateName, keyWithSpace, key) {
				that.info.tag = tag;
				that.info.templateName = templateName;
				that.info.keyWithSpace = keyWithSpace;
				that.info.key = key;
			};
		})

		it("renders the template for each key in the context", function() {
			var source = "#{render details foreach}"
			source.replace(Template.REGEX_FOREACH, this.foreachReplacer);

			expect(this.info.tag).toBe(source);
			expect(this.info.templateName).toBe("details");
			expect(this.info.key).toBe("");
		});

		it("renders the template for each key in the context with the specified key", function() {
			var source = "#{render foo/bar foreach item}";
			source.replace(Template.REGEX_FOREACH, this.foreachReplacer);

			expect(this.info.tag).toBe(source);
			expect(this.info.templateName).toBe("foo/bar");
			expect(this.info.key).toBe("item");
		});

	});

	describe("render", function() {

		it("renders variables matching properties in the data", function() {
			var data = {
				foo: "bar"
			};
			var templateSource = '<p>#{foo}</p>';
			var template = new Template("test/render/variables", templateSource);
			var renderedSource = template.render(data);
			expect(renderedSource).toEqual('<p>bar</p>');
		});

		it("renders multple instances of variables", function() {
			var data = {
				foo: "bar"
			};
			var templateSource = [
				'<p>Foo: #{foo}</p>',
				'<div class="#{foo}">#{foo}</div>'
			].join("");
			var template = new Template("test/render/all_variable_instances", templateSource);
			var renderedSource = template.render(data);
			expect(renderedSource).toEqual('<p>Foo: bar</p><div class="bar">bar</div>');
		});

		it("renders multiple variables", function() {
			var data = {
				title: "Just testing",
				type: "bar",
				id: 1
			};
			var templateSource = [
				'<section class="#{type}" id="foo-#{id}">',
					'<h1>#{title}</h1>',
				'</section>'
			].join("");
			var expectedSource = [
				'<section class="bar" id="foo-1">',
					'<h1>Just testing</h1>',
				'</section>'
			].join("");
			var template = new Template("test/render/multiple_variables", templateSource);
			var renderedSource = template.render(data);
			expect(renderedSource).toEqual(expectedSource);
		});

		it("renders variables with special characters", function() {
			var data = {
				"foo.bar": "foo.bar",
				"foo_bar": "foo_bar",
				"foo-bar": "foo-bar"
			};
			var templateSource = [
				'<ul>',
					'<li>#{foo.bar}</li>',
					'<li>#{foo_bar}</li>',
					'<li>#{foo-bar}</li>',
				'</ul>'
			].join("");
			var template = new Template("test/render/variables_with_special_chars", templateSource);
			var expectedSource = [
				'<ul>',
					'<li>foo.bar</li>',
					'<li>foo_bar</li>',
					'<li>foo-bar</li>',
				'</ul>'
			].join("");
			var renderedSource = template.render(data);
			expect(renderedSource).toEqual(expectedSource);
		});

		describe("#{include}", function() {

			it("renders template includes", function() {
				var data = {
					title: "Testing"
				};
				var templateSource = [
					'#{include test/render/includes}',
					'<strong>#{title}</strong>'
				].join("");
				var includeSource = '<div>I am included!</div>';
				var template = new Template("test/render/included_templates", templateSource);
				Template.templates["test/render/includes"] = new Template("test/render/includes", includeSource);
				var expectedSource = [
					'<div>I am included!</div>',
					'<strong>Testing</strong>'
				].join("");
				var renderedSource = template.render(data);
				expect(renderedSource).toEqual(expectedSource);
			});

		});

		describe("#{render}", function() {

			it("renders sub templates with data", function() {
				var data = {
					firstName: "John",
					lastName: "Doe",
					age: 30
				};
				var templateSource = [
					'<h1>Person</h1>',
					'#{render test/render/with_data}'
				].join("");
				var subTemplateSource = '#{firstName} #{lastName}, age #{age}';
				var template = new Template("test/render/with_data_test", templateSource);
				Template.templates["test/render/with_data"] = new Template("test/render/with_data", subTemplateSource);
				var expectedSource = [
					'<h1>Person</h1>',
					'John Doe, age 30'
				].join("");

				var renderedSource = template.render(data);
				expect(renderedSource).toEqual(expectedSource);
			});

			it("renders sub templates with a data key", function() {
				var data = {
					name: "Bob",
					position: {
						name: "The Builder",
						id: 24
					}
				};
				var templateSource = [
					'Name: #{name}<br>',
					'#{render test/render/position_template with position}'
				].join("");
				var subTemplateSource = [
					'Position Name: #{name}<br>',
					'Position Id: #{id}<br>'
				].join("");
				var template = new Template("test/render/sub_templates", templateSource);
				Template.templates["test/render/position_template"] = new Template("test/render/position_template", subTemplateSource);
				var expectedSource = [
					'Name: Bob<br>',
					'Position Name: The Builder<br>',
					'Position Id: 24<br>'
				].join("");
				var renderedSource = template.render(data);
				expect(renderedSource).toEqual(expectedSource);
			});

			it("renders sub templates with an array of data", function() {
				var data = {
					name: "Bob",
					projects: [{
						name: "Golden Gate Bridge",
						budget: 10000000
					},{
						name: "The Pyramids",
						budget: 450000000
					}]
				};
				var templateSource = [
					'Name: #{name}<br>',
					'<ul>#{render test/render/projects with projects}</ul>'
				].join("");
				var subTemplateSource = '<li>#{name} (Cost: #{budget})</li>';
				var template = new Template("test/render/sub_templates_array", templateSource);
				Template.templates["test/render/projects"] = new Template("test/render/projects", subTemplateSource);
				var expectedSource = [
					'Name: Bob<br>',
					'<ul>',
						'<li>Golden Gate Bridge (Cost: 10000000)</li>',
						'<li>The Pyramids (Cost: 450000000)</li>',
					'</ul>'
				].join("");
				var renderedSource = template.render(data);
				expect(renderedSource).toEqual(expectedSource);
			});

		});

		describe("#{render foreach}", function() {

			beforeEach(function() {
				Template.templates["products/item"] = new Template("products/item", [
					'<p id="#{@loop.index}" class="#{@loop.iteration}">',
						'#{name}<br>',
						'#{price}',
					'</p>'
				].join(""));
			});

			it("renders sub templates once for each key", function() {
				var template = new Template();
				template.source = "#{render products/item foreach}";
				var data = {
					a: {
						name: "Test",
						price: 12.99
					},
					b: {
						name: "Testing",
						price: 2.5
					}
				};
				var result = template.render(data);
				var expected = [
					'<p id="a" class="even">',
						'Test<br>',
						'12.99',
					'</p>',
					'<p id="b" class="odd">',
						'Testing<br>',
						'2.5',
					'</p>'
				].join("");

				expect(result).toBe(expected)
			});

			it("renders sub templates once for each index", function() {
				var template = new Template();
				template.source = "#{render products/item foreach products}";

				var data = {
					products: [{
						name: "Test",
						price: 12.99
					},{
						name: "Testing",
						price: 2.5
					}]
				};

				var result = template.render(data);

				var expected = [
					'<p id="0" class="even">',
						'Test<br>',
						'12.99',
					'</p>',
					'<p id="1" class="odd">',
						'Testing<br>',
						'2.5',
					'</p>'
				].join("");

				expect(result).toBe(expected);
			});

		});

		it("properly renders all tags in the same template", function() {
			Template.templates["blog/logo"] = new Template("blog/logo", "<h1>Test Blog</h1>");

			Template.templates["blog/tags"] = new Template("blog/tags", '<li id="tag-#{@loop.index}">#{name}</li>');

			Template.templates["blog/comments"] = new Template("blog/comments", '<li id="comment-#{@loop.index}" class="#{@loop.iteration}">#{text} - #{name}</li>');

			Template.templates["blog/post"] = new Template("blog/post", [
				'#{include blog/logo}',
				'<article>',
					'<h2>#{title}</h2>',
					'<div>#{body}</div>',
					'<ul>',
						'#{render blog/tags foreach tags}',
					'</ul>',
					'<ol>',
						'#{render blog/comments with comments}',
					'</ol>',
				'</article>'
			].join(""));

			var data = {
				title: "Just Testing",
				body: "Just a test.",
				tags: [{
					name: "test"
				},{
					name: "foo"
				}],
				comments: [{
					name: "John Doe",
					text: "You're wrong!"
				},{
					name: "Anonymous Coward",
					text: "No YOU'RE wrong!"
				}]
			};

			var result = Template.find("blog/post").render(data);

			var expected = [
				'<h1>Test Blog</h1>',
				'<article>',
					'<h2>Just Testing</h2>',
					'<div>Just a test.</div>',
					'<ul>',
						'<li id="tag-0">test</li>',
						'<li id="tag-1">foo</li>',
					'</ul>',
					'<ol>',
						'<li id="comment-0" class="even">You\'re wrong! - John Doe</li>',
						'<li id="comment-1" class="odd">No YOU\'RE wrong! - Anonymous Coward</li>',
					'</ol>',
				'</article>'
			].join("");

			expect(result).toBe(expected);
		});

	});

	describe("setSource", function() {

		beforeEach(function() {
			this.template = new Template("test/test", "abc")
		});

		it("sets the source from a string", function() {
			var source = "I am a template!";
			this.template.setSource(source);
			expect(this.template.source).toEqual(source);
		});

		it("sets the source from a SCRIPT tag whose type is text/html", function() {
			var source = document.createElement("script");
			source.setAttribute("type", "text/html");
			source.setAttribute("data-template-name", "test/set_source_by_script");
			source.innerHTML = "I am a template!";
			this.template.setSource(source);
			expect(this.template.source).toEqual(source.innerHTML);
		});

	});

});
