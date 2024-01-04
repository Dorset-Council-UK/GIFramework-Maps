using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace GIFrameworkMaps.Web.TagHelpers
{
  public class LabelledSliderTagHelper : TagHelper
    {
        public ModelExpression AspFor { get; set; }
        public int MaxValue { get; set; }
        public int MinValue { get; set; }
        public int Step { get; set; }
        public int DefaultIfNull {  get; set; }
        private readonly IHtmlHelper _htmlHelper;
        [ViewContext]
        [HtmlAttributeNotBound]
        public ViewContext ViewContext { get; set; }

        public LabelledSliderTagHelper(IHtmlHelper htmlHelper)
        {
            _htmlHelper = htmlHelper;
        }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            (_htmlHelper as IViewContextAware).Contextualize(ViewContext);
            var id = _htmlHelper.GenerateIdFromName(AspFor.Name);
            output.TagName = "div";
            output.Attributes.Add("class", "row");
            output.Content.SetHtmlContent($@"
                <div class=""col"">
                    <input type=""range"" id=""{id}"" class=""form-range"" min=""{MinValue}"" max=""{MaxValue}"" name=""{AspFor.Name}"" step=""{Step}"" value=""{(AspFor.Model ?? DefaultIfNull)}"" />
                </div>
                <div class=""col-auto"">
                    <output for=""{AspFor.Name}"" class=""badge bg-primary"" style=""width:3rem;"">{(AspFor.Model ?? DefaultIfNull)}%</output>
                </div>
                <script>
                (() => {{
                    let outputEle = document.querySelector('output[for=""{AspFor.Name}""]');
                    let target = document.querySelector(`input[name=""${{outputEle.htmlFor}}""]`);
                    if(target){{
                        target.addEventListener('input', evt => {{
                            outputEle.innerText = `${{target.value}}%`;
                        }})
                    }}
                }})();
                </script>
            ");

            //output.TagName = "input";
            //output.Attributes.SetAttribute("name", AspFor.Name);
            //output.Attributes.SetAttribute("type", "range");
            //output.Attributes.SetAttribute("class", "form-range");
            //output.Attributes.SetAttribute("max", MaxValue);
            //output.Attributes.SetAttribute("min", MinValue);
            //output.Attributes.SetAttribute("value", AspFor.Model);

        }
    }
}
