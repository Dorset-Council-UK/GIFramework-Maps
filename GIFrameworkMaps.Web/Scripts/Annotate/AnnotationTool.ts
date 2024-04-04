import { Type as olGeomType } from "ol/geom/Geometry";

export class AnnotationTool {
  button: HTMLButtonElement;
  buttonContainer: HTMLDivElement;
  buttonTitle: string;
  name: string;
  olDrawType: olGeomType;
  optionsHTML?: string;

  constructor(
    name: string,
    buttonTitle: string,
    className: string,
    innerHTML: string,
    olDrawType: olGeomType,
  ) {
    this.button = document.createElement("button");
    this.buttonContainer = document.createElement("div");
    this.name = name;
    this.olDrawType = olDrawType;

    this.buttonContainer.appendChild(this.button);
    this.buttonContainer.classList.add(
      className,
      "gifw-annotation-control",
      "ol-unselectable",
      "ol-control",
      "ol-hidden",
    );
    this.button.innerHTML = innerHTML;
    this.buttonTitle = buttonTitle;
    this.button.setAttribute("title", buttonTitle);
  }
}

export const PolygonTool = new AnnotationTool(
  "Polygon",
  "Draw a polygon",
  "gifw-polygon-control",
  '<i class="bi bi-bounding-box-circles"></i>',
  "Polygon",
);
PolygonTool.optionsHTML = `
    <div class="form-group row mb-1">
        <label class="form-label">Line colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="strokeColour" list="annotationColors" id="colors" />
                <datalist id="annotationColors">
                    <option value="#648fff"></option>
                    <option value="#785EF0"></option>
                    <option value="#DC267F"></option>
                    <option value="#FE6100"></option>
                    <option value="#FFB000"></option>
                    <option value="#000000"></option>
                </datalist>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Fill colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="fillColour" list="annotationColors" id="colors" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-polygon-opacity">Fill opacity</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="opacity" id="gifw-annotation-control-polygon-opacity" min="0" max="1" value="0.2" step="0.1" oninput="document.querySelector('output[for=gifw-annotation-control-polygon-opacity]').value=(this.value * 100) + '%'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-polygon-opacity" class="badge bg-primary" style="width:3rem;">20%</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-polygon-line-width">Line width</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="strokeWidth" id="gifw-annotation-control-polygon-line-width" min="1" max="5" value="2" oninput="document.querySelector('output[for=gifw-annotation-control-polygon-line-width]').value=this.value + 'px'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-polygon-line-width" class="badge bg-primary" style="width:3rem;">2px</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Line Style</label>
        <div>
            <select class="form-select" data-style-property="strokeStyle">
                <option selected value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
            </select>
        </div>
    </div>
`;

export const LineTool = new AnnotationTool(
  "Line",
  "Draw a line",
  "gifw-line-string-control",
  '<i class="bi bi-share"></i>',
  "LineString",
);
LineTool.optionsHTML = `
    <div class="form-group row mb-1">
        <label class="form-label">Line colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="strokeColour" list="annotationColors" id="colors" />
                <datalist id="annotationColors">
                    <option value="#648fff"></option>
                    <option value="#785EF0"></option>
                    <option value="#DC267F"></option>
                    <option value="#FE6100"></option>
                    <option value="#FFB000"></option>
                    <option value="#000000"></option>
                </datalist>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-line-width">Line width</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="strokeWidth" id="gifw-annotation-control-line-width" min="1" max="5" value="2" oninput="document.querySelector('output[for=gifw-annotation-control-line-width]').value=this.value + 'px'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-line-width" class="badge bg-primary" style="width:3rem;">2px</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Line Style</label>
        <div>
            <select class="form-select" data-style-property="strokeStyle">
                <option selected value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
            </select>
        </div>
    </div>
`;

export const PointTool = new AnnotationTool(
  "Point",
  "Draw a point",
  "gifw-point-control",
  '<i class="bi bi-geo"></i>',
  "Point",
);
PointTool.optionsHTML = `
    <div class="form-group row mb-1">
        <label class="form-label">Shape</label>
        <div>
            <select class="form-select" data-style-property="pointType">
                <option value="circle">Circle</option>
                <option value="cross">Cross</option>
                <option value="heart">Heart</option>
                <option selected value="pin">Pin</option>
                <option value="square">Square</option>
                <option value="diamond">Diamond</option>
                <option value="star">Star</option>
                <option value="triangle">Triangle</option>
                <option value="house">House</option>
                <option value="lightning">Lightning</option>
                <option value="person">Person</option>
                <option value="tree">Tree</option>
            </select>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="fillColour" list="annotationColors" id="colors" />
                <datalist id="annotationColors">
                    <option value="#648fff"></option>
                    <option value="#785EF0"></option>
                    <option value="#DC267F"></option>
                    <option value="#FE6100"></option>
                    <option value="#FFB000"></option>
                    <option value="#000000"></option>
                </datalist>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-point-size">Size</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="size" id="gifw-annotation-control-point-size" min="12" max="60" value="24" step="12" oninput="document.querySelector('output[for=gifw-annotation-control-point-size]').value=this.value + 'px'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-point-size" class="badge bg-primary" style="width:3rem;">24px</output>
            </div>
        </div>
    </div>
    <div class="form-group mb-1">
        <div class="form-check">
            <input class="form-check-input" type="checkbox" id="gifw-annotation-point-border-options" data-style-property="pointHasBorder" />
            <label for="gifw-annotation-point-border-options" class="form-check-label">Border</label>
        </div>
    </div>
    <div class="ps-2 border-start border-2" id="gifw-annotations-border-options">
        <div class="form-group mb-1">
            <div>
                <label class="form-label" for="gifw-annotation-border-colors">Border colour</label>
                <input type="color" class="form-range" data-style-property="borderColour" list="annotationBorderColors" id="gifw-annotation-border-colors">
                    <datalist id="annotationBorderColors">
                        <option value="#000000"></option>
                        <option value="#FFFFFF"></option>
                        <option value="#648fff"></option>
                        <option value="#785EF0"></option>
                        <option value="#DC267F"></option>
                        <option value="#FE6100"></option>
                        <option value="#FFB000"></option>
                    </datalist>
            </div>
        </div>
        <div class="form-group mb-1">
            <label class="form-label" for="gifw-annotation-point-border-thickness">Border thickness</label>
            <div class="row">
                <div class="col">
                    <input id="gifw-annotation-point-border-thickness" type="range" class="form-range" data-style-property="borderWidth" min="0.2" max="1" value="0.5" step="0.1" oninput="document.querySelector('output[for=gifw-annotation-point-border-thickness]').value=this.value + 'px'">
                </div>
                <div class="col-auto">
                    <output for="gifw-annotation-point-border-thickness" class="badge bg-primary" style="width:3rem;">0.5px</output>
                </div>
            </div>
        </div>
    </div>
`;

export const CircleTool = new AnnotationTool(
  "Circle",
  "Draw a circle",
  "gifw-circle-control",
  '<i class="bi bi-circle"></i>',
  "Circle",
);
CircleTool.optionsHTML = `
    <div class="form-group row mb-1">
        <label class="form-label">Line colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="strokeColour" list="annotationColors" id="colors" />
                <datalist id="annotationColors">
                    <option value="#648fff"></option>
                    <option value="#785EF0"></option>
                    <option value="#DC267F"></option>
                    <option value="#FE6100"></option>
                    <option value="#FFB000"></option>
                    <option value="#000000"></option>
                </datalist>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Fill colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="fillColour" list="annotationColors" id="colors" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-circle-opacity">Fill opacity</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="opacity" id="gifw-annotation-control-circle-opacity" min="0" max="1" value="0.2" step="0.1" oninput="document.querySelector('output[for=gifw-annotation-control-circle-opacity]').value=(this.value * 100) + '%'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-circle-opacity" class="badge bg-primary" style="width:3rem;">20%</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-circle-line-width">Line width</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="strokeWidth" id="gifw-annotation-control-circle-line-width" min="1" max="5" value="2" oninput="document.querySelector('output[for=gifw-annotation-control-circle-line-width]').value=this.value + 'px'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-circle-line-width" class="badge bg-primary" style="width:3rem;">2px</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Line Style</label>
        <div>
            <select class="form-select" data-style-property="strokeStyle">
                <option selected value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
            </select>
        </div>
    </div>
`;

export const BufferTool = new AnnotationTool(
  "Buffer",
  "Draw a buffer",
  "gifw-buffer-control",
  '<i class="bi bi-record-circle"></i>',
  "Point",
);
BufferTool.optionsHTML = `
    <div class="form-group row mb-1">
        <label class="form-label">Radius</label>
        <div class="col-sm-10 col-md-8">
            <div class="input-group mb-3">
                <input type="number" class="form-control" id="radiusNumber" data-style-property="radiusNumber">
                    <select class="form-select" id="radiusUnit" data-style-property="radiusUnit">
                        <option selected value="meters">Metres</option>
                        <option value="kilometers">Kilometres</option>
                        <option value="miles">Miles</option>
                        <option value="yards">Yards</option>
                        <option value="feet">Feet</option>
                    </select>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Line colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="strokeColour" list="annotationColors" id="colors" />
                <datalist id="annotationColors">
                    <option value="#648fff"></option>
                    <option value="#785EF0"></option>
                    <option value="#DC267F"></option>
                    <option value="#FE6100"></option>
                    <option value="#FFB000"></option>
                    <option value="#000000"></option>
                </datalist>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Fill colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="fillColour" list="annotationColors" id="colors" />
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-buffer-opacity">Fill opacity</label>
        <div class="row">
            <div class ="col">
                <input type="range" class="form-range" data-style-property="opacity" id="gifw-annotation-control-buffer-opacity" min="0" max="1" value="0.2" step="0.1" oninput="document.querySelector('output[for=gifw-annotation-control-buffer-opacity]').value=(this.value * 100) + '%'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-buffer-opacity" class="badge bg-primary" style="width:3rem;">20%</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-buffer-line-width">Line width</label>
        <div class="row">
            <div class ="col">
                <input type="range" class="form-range" data-style-property="strokeWidth" id="gifw-annotation-control-buffer-line-width" min="1" max="5" value="2" oninput="document.querySelector('output[for=gifw-annotation-control-buffer-line-width]').value=this.value + 'px'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-buffer-line-width" class="badge bg-primary" style="width:3rem;">2px</output>
            </div>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Line Style</label>
        <div>
            <select class="form-select" data-style-property="strokeStyle">
                <option selected value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
            </select>
        </div>
    </div>
`;

export const TextTool = new AnnotationTool(
  "Text",
  "Add text",
  "gifw-text-control",
  '<i class="bi bi-fonts"></i>',
  "Point",
);
TextTool.optionsHTML = `
    <div class="form-group row mb-1">
        <label class="form-label">Text</label>
        <div>
            <input type="text" class="form-control" data-style-property="labelText">
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Font</label>
        <div>
            <select class="form-select" aria-label="Font" data-style-property="font">
                <option selected value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Impact">Impact</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
            </select>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Font style</label>
        <div>
            <select class="form-select" aria-label="Style" data-style-property="fontStyle">
                <option selected value="normal">Normal</option>
                <option value="italic">Italic</option>
                <option value="bold">Bold</option>
            </select>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label">Font colour</label>
        <div>
            <input type="color" class="form-range" data-style-property="fontColour" list="annotationColors" id="colors" />
                <datalist id="annotationColors">
                    <option value="#648fff"></option>
                    <option value="#785EF0"></option>
                    <option value="#DC267F"></option>
                    <option value="#FE6100"></option>
                    <option value="#FFB000"></option>
                    <option value="#000000"></option>
                </datalist>
        </div>
    </div>
    <div class="form-group row mb-1">
        <label class="form-label" for="gifw-annotation-control-font-size">Font size</label>
        <div class="row">
            <div class="col">
                <input type="range" class="form-range" data-style-property="size" id="gifw-annotation-control-font-size" min="16" max="64" value="24" step="8" oninput="document.querySelector('output[for=gifw-annotation-control-font-size]').value=this.value + 'px'">
            </div>
            <div class="col-auto">
                <output for="gifw-annotation-control-font-size" class="badge bg-primary" style="width:3rem;">24px</output>
            </div>
        </div>
    </div>
`;
