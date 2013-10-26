# Template

Template provides basic templating functionality in JavaScript,
including iterating over arrays and rendering sub templates that are
embedded or fetched via AJAX.

It does not require any outside dependencies and integrates with any
other JavaScript library.

## Getting Started

Just include `template.js` in your web page. Next, you'll want to
define your templates, which can be done in three ways:

1. Embedded HTML templates
2. Dynamically downloaded HTML templates
3. Programmatically

### Embedded HTML Templates

You may embed templates in an HTML file by placing the source code for
the template in a special `<script>` tag.

    <script type="text/html" data-template-name="blogs/post">
        <h2>#{title}</h2>
        <p>#{date}</p>
        <div>
            #{body}
        </div>
    </script>

This may suffice for small or simple web applications, but as your
application grows in size, these embedded templates clutter up your
HTML file and increase the weight of the page.

### Dynamically Downloaded HTML Templates

Templates may be downloaded as they are used for rendering by keeping
the source code for the template in text files on the server, and
placing a `<script>` tag like the one below in your HTML file:

    <script type="text/html" data-template-name="blogs/post" data-src="/views/blogs/post.html.tpl"></script>

The `data-src` attribute is used to hold a relative URL to the
template file that should be downloaded upon rendering. As we'll see
later, rendering templates can be an asynchronous process. Before
that, let's look at how to programmatically create templates.

### Programmatically Creating Templates

There are four steps in creating templates with plain JavaScript:

    // 1.
    var template = new Template();

    // 2.
    template.name = "blog/post";

    // 3.
    template.setSource([
        '<h2>#{title}</h2>',
        '<p>#{date}</p>',
        '<div>',
            '#{body}',
        '</div>'
    ].join(""));

    // 4.
    Template.register(template);

1. Instantiate a new `Template` instance
2. Give it a name
3. Give it the source code
4. Register the template for use later on

You can see all registered templates in `Template.templates`.

## Rendering Templates

If all of your templates are embedded in the HTML file, template
rendering will be synchronous.

If one of your templates is downloadable, then template rendering can
be asychronous.

It's best to assume that template rendering is asynchronous each time.
Because of this, use `Template.render(...)`, which accepts the name of
the template to render, the data to render the template with, and a
callback and context.

    var data = {
        title: "Template Rendering",
        body: "It's easy!"
    };

    var element = document.createElement("div");

    Template.render("blog/post", data, this, function(html, template) {
        element.innerHTML = html;
    });

### Arguments to `Template.render`

1. templateName (string): The name of a registered template
2. data (Object): The object used to render the template
3. context (Object): Sets the object that `this` refers to in the
   render callback.
4. callback (Function): The function executed after all templates and
   sub templates have been downloaded and rendered.

   The callback function itself receives two arguments:

   1. html (String): The rendered template, ready to be inserted into
      the Document Object Model.
   2. template (Template): The template instance used to render the
      html.

## Template Tags

This is a very simple template language, and there are only six tags
in the language.

- Render data by property name
- Include another template
- Render another template with data
- Render another template in a loop
- Display the index of the current iteration in the render loop
- Display "even" or "odd" in the current iteration in the render loop

### Rendering Data by Property Name

To just spit out the value of the template data at a certain key, just
reference the name of the property:

    #{title}
    #{body_text}
    #{post.title}
    #{post-title}

Letters, numbers, dashes, underscores and periods are all acceptable
characters for these tag names. They must correspond to properties on
the data used to render the template. Using the example template
above, you would need this data structure:

    {
        title: "...",
        body_text: "...",
        "post.title": "...",
        "post-title": "..."
    }

### Include Another Template

This is the client side equivalent of a server side include. No
special logic goes on here. It's basically a copy and paste operation
allowing you to include one template inside another. No template tag
interpretation is done here.

Template includes are ideal for static content.

    #{include blog/logo}
    <h2>#{title}</h2>

A template named `blog/logo` would be inserted in place of the
`#{include blog/logo}` template tag. There should be a `script` tag
in your web page, similar to the one below:

    <script type="text/html" data-template-name="blog/logo">
        <h1>My Spiffy Blog!</h1>
    </script>

Again, No `#{...}` template tags will be interpretted inside included
templates.

### Render Another Template With Data

It's often necessary to render a template inside another with data in
an effort to DRY (Don't Repeat Yourself) your views. In this case, use
the `#{render}` tag:

    #{render blog/post with post}

This assumes you have the template defined like this:

    <script type="text/html" data-template-name="blog/post">
        <h2>#{title}</h2>
        <div>#{body}</div>
    </script>

And you are using this data structure to render the template:

    {
        post: {
            title: "...",
            body: "..."
        }
    }

Sometimes you need to render a hash or array of data. For this you'll
use a variation of the render tag.

### Render Another Template in a Loop

If you have an array of data you'd like to render, or hash of
key-value pairs you'd like to render, then use the foreach-style
render tag.

    <ol>
        #{render blog/comments foreach comments}
    </ol>

This assumes the template exists on your page like below:

    <script type="text/html" data-template-name="blog/comments">
        <li>#{text} - #{name}</li>
    </script>

The data structure below is what you would need to render this
template:

    {
        comments: [{
            text: "...",
            name: "..."
        },{
            text: "...",
            name: "..."
        }]
    }

You could also use this data structure:

    {
        comments: {
            1000: {
                text: "...",
                name: "..."
            },
            1001: {
                text: "...",
                name: "..."
            }
        }
    }

Just beware that the for-in loop used in JavaScript to iterate over
this key-value pair data structure could display items in different
orders on different browsers.

There are two special template tags that can be used to access certain
properties of the loop in JavaScript while rendering the template.

- `#{@loop.index}` &mdash; This special template tag displays the
  index number of the current iteration in the loop. If looping over
  a hash of key-value pairs, this displays the name of the key inside
  the for-in loop.
- `#{@loop.iteration}` &mdash; This displays either "even" or "odd",
  depending on whether or not the current iteration is even or not.
  This is useful for creating zebra striped tables or lists. This
  special tag also works when looping over a key-value pair hash.

## Template Tag Reference

- `#{title}` &mdash; Gets replaced by the value of "title" property.
- `#{include blog/logo}` &mdash; Includes a static template
- `#{render blog/post_details with post}` &mdash; Renders a sub
  template, doing further interpolation of template tags. The "post"
  property is passed in to render the sub template in this case.
- `#{render blog/comments foreach comments}` &mdash; Render a sub
  template repeatedly. Useful for generating tables or lists of items.
- `#{@loop.index}` &mdash; Value of the current loop index. This is
  only available in the foreach-style render tag.
- `#{@loop.iteration}` &mdash; Displays either "even" or "odd". Useful
  for making zebra striped tables or lists. This is only available in
  the foreach-style render tag.

## Example Template with all the Fixin's

Let's tie all of these tags together into one example:

    <body>
        <script type="text/html" data-template-name="blog/logo">
            <h1>My Spiffy Blog!</h1>
        </script>

        <script type="text/html" data-template-name="blog/post_details">
            <h2>#{title}</h2>
            <div>#{body}</div>
        </script>

        <script type="text/html" data-template-name="blog/comments">
            <li>#{text} - #{name}</li>
        </script>

        <script type="text/html" data-template-name="blog/post">
            #{include blog/logo}

            <article>
                #{render blog/post_details with post}

                <ol>
                    #{render blog/comments foreach comments}
                </ol>
            </article>
        </script>

        <script type="text/javascript">

            var data = {
                post: {
                    title: "...",
                    body: "..."
                },
                comments: [{
                    text: "...",
                    name: "..."
                },{
                    text: "...",
                    name: "..."
                }]
            };

            var element = document.createElement('div');

            Template.render("blog/post", data, this, function(html, template) {
                element.innerHTML = html;
                document.body.appendChild(element);
            });

        </script>
    </body>

## What's Next?

Clone or download this repository and check out the demo.