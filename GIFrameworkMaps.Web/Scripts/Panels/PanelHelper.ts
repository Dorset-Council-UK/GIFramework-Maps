import { Layer as olLayer } from "ol/layer";
import { GIFWMap } from "../Map";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";

export class PanelHelper {
    /**
     * Renders a slider control for a particular basemap
     * @param layerConfiguration The basemap that will be controlled by this slider
     * @param startingValue The starting value of the slider
     * @param controlType The type of control. Either 'opacity' or 'saturation'
     * @returns HTML Element with the label, slider control and checkbox in a container
     */
    public static renderSliderControl(layerId: string, startingValue: number = 100, step: number = 1, controlType: "saturation" | "opacity", layerType: "layer" | "basemap", gifwMapInstance: GIFWMap) {
        const controlsContainer = document.createElement('div');
        //label
        const controlLabel = document.createElement('label');
        controlLabel.textContent = controlType.charAt(0).toUpperCase() + controlType.slice(1)
        controlLabel.htmlFor = `${layerType}-${controlType}-${layerId}`;
        controlLabel.className = 'form-label';
        //row/columns for slider control
        const controlSliderRow = document.createElement('div');
        controlSliderRow.className = "row";
        const controlSliderContainer = document.createElement('div');
        controlSliderContainer.className = "col";
        const controlOutputContainer = document.createElement('div');
        controlOutputContainer.className = "col-auto";
        //<output> for slider control
        const controlOutputElement = document.createElement('output');
        controlOutputElement.id = `${layerType}-${controlType}-output-${layerId}`;
        controlOutputElement.className = 'badge bg-primary';
        controlOutputElement.style.width = '3rem';
        controlOutputElement.innerText = `${(startingValue)}%`;
        //The slider control
        const control = document.createElement('input');
        control.type = 'range';
        control.id = `${layerType}-${controlType}-${layerId}`;
        control.className = 'form-range';
        control.step = step.toString();
        control.dataset.gifwControlsBasemap = layerId;
        control.value = startingValue.toString()
        //build controls
        controlSliderContainer.appendChild(control);
        controlOutputContainer.appendChild(controlOutputElement);
        controlSliderRow.appendChild(controlSliderContainer);
        controlSliderRow.appendChild(controlOutputContainer);
        //checkbox
        const toggleMinimumCheckbox = document.createElement('input');
        toggleMinimumCheckbox.type = 'checkbox';
        toggleMinimumCheckbox.id = `${layerType}-${controlType}-check-${layerId}`;
        toggleMinimumCheckbox.className = 'form-check-input';
        if (startingValue === 0) {
            toggleMinimumCheckbox.checked = true;
        }
        toggleMinimumCheckbox.dataset.gifwControlsBasemap = layerId;
        //checkbox label
        const toggleMinimumCheckboxLabel = document.createElement('label');
        toggleMinimumCheckboxLabel.htmlFor = `${layerType}-${controlType}-check-${layerId}`;
        toggleMinimumCheckboxLabel.className = 'form-check-label';
        toggleMinimumCheckboxLabel.textContent = controlType === "saturation" ? "Greyscale" : "Invisible";
        //checkbox container
        const toggleMinimumCheckboxContainer = document.createElement('div');
        toggleMinimumCheckboxContainer.className = 'form-check';
        //build checkbox
        toggleMinimumCheckboxContainer.appendChild(toggleMinimumCheckbox);
        toggleMinimumCheckboxContainer.appendChild(toggleMinimumCheckboxLabel);

        //add controls to container
        controlsContainer.appendChild(controlLabel);
        controlsContainer.appendChild(controlSliderRow);
        controlsContainer.appendChild(toggleMinimumCheckboxContainer);

        //add event listeners
        control.addEventListener('input', e => {
            const value = parseInt((e.currentTarget as HTMLInputElement).value);
            controlOutputElement.innerText = `${(value)}%`
            if (value === 0) {
                toggleMinimumCheckbox.checked = true;
            } else {
                toggleMinimumCheckbox.checked = false;
            }
            if (controlType === "saturation") {
                if (layerType === 'layer') {
                    gifwMapInstance.setLayerSaturation(gifwMapInstance.getLayerById(layerId) as olLayer<Source, LayerRenderer<olLayer>>,value);
                } else {
                    gifwMapInstance.setSaturationOfActiveBasemap(value);
                }
            } else {
                if (layerType === 'layer') {
                    gifwMapInstance.setLayerOpacity(gifwMapInstance.getLayerById(layerId) as olLayer<Source, LayerRenderer<olLayer>>, value);
                } else {
                    gifwMapInstance.setTransparencyOfActiveBasemap(value);
                }
                
            }

        });
        toggleMinimumCheckbox.addEventListener('change', e => {
            const element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

            if (element.checked) {
                control.value = "0";
            } else {
                control.value = "100";
            }
            const evt = new InputEvent('input');
            control.dispatchEvent(evt);
        });
        return controlsContainer;
    }
}