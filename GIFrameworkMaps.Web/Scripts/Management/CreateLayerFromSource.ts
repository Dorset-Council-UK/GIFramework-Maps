import GML3 from "ol/format/GML3";
import WFS from "ol/format/WFS";
import { FeaturePropertiesHelper } from "../FeatureQuery/FeaturePropertiesHelper";
import { FeatureQueryRequest } from "../Interfaces/FeatureQuery/FeatureQueryRequest";
import { FeatureQueryResponse } from "../Interfaces/FeatureQuery/FeatureQueryResponse";
import { CapabilityType } from "../Interfaces/OGCMetadata/BasicServerCapabilities";
import { Metadata } from "../Metadata/Metadata";
import { default as nunjucks } from "nunjucks";
import { DateTime } from "luxon";
class CreateLayerFromSource {
    htmlTags = [
        { tagId: 'h1', openTag: '<h1>', closeTag: '</h1>' },
        { tagId: 'h2', openTag: '<h2>', closeTag: '</h2>' },
        { tagId: 'h3', openTag: '<h3>', closeTag: '</h3>' },
        { tagId: 'h4', openTag: '<h4>', closeTag: '</h4>' },
        { tagId: 'p', openTag: '<p>', closeTag: '</p>' },
        { tagId: 'br', openTag: '<br/>', closeTag: '' },
        { tagId: 'strong', openTag: '<strong>', closeTag: '</strong>' },
        { tagId: 'i', openTag: '<i>', closeTag: '</i>' },
        { tagId: 'a', openTag: '<a href="" target="_blank" title="">', closeTag: '</a>' },
        { tagId: 'img', openTag: '<img src="" />', closeTag: '' }];
    templateInput: HTMLTextAreaElement;
    listTemplateInput: HTMLInputElement;
    layerSourceURL: string;
    layerSourceName: string;
    _cachedExampleFeature: any;
    constructor() {
        this.templateInput = document.querySelector('textarea[data-template-target]') as HTMLTextAreaElement;
        this.listTemplateInput = document.querySelector('input[data-list-template-target]') as HTMLInputElement;
        this.layerSourceURL = (document.getElementById('layer-source-url') as HTMLInputElement).value;
        this.layerSourceName = (document.getElementById('layer-source-name') as HTMLInputElement).value;
        let env = nunjucks.configure({ autoescape: false });
        env.addFilter('date', (str, format) => {
            let dt = DateTime.fromISO(str);
            if (format) {
                return dt.toFormat(format);
            } else {
                return dt.toLocaleString();
            }

        });
    }

    public async init() {
        await this.renderAttributeLists();
        //attach HTML tag buttons
        document.querySelectorAll('#template-html-tags-pane button').forEach(btn => {
            btn.addEventListener('click', () => {
                const tagId = (btn as HTMLButtonElement).dataset.tag;
                const tag = this.htmlTags.filter(t => t.tagId === tagId)[0];
                let tagStr = tag.openTag;
                if ((btn as HTMLButtonElement).dataset.tagClose === 'true') {
                    tagStr = tag.closeTag;
                }
                //insert into template
                const templateInput = document.querySelector('textarea[data-template-target]');
                this.insertAtCaret(tagStr, templateInput as HTMLTextAreaElement);

            })
        })
        
        //attach date formatting helper buttons
        document.querySelectorAll('#list-template-date-formatting-pane a[data-date-format]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const formatString = (link as HTMLAnchorElement).dataset.dateFormat;
                let formatTemplate = ' | date';
                if (formatString) {
                    formatTemplate += `('${formatString}')`;
                }
                this.insertAtCaret(formatTemplate, this.listTemplateInput);
            })
        });
        document.querySelectorAll('#template-date-formatting-pane a[data-date-format]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const formatString = (link as HTMLAnchorElement).dataset.dateFormat;
                let formatTemplate = ' | date';
                if (formatString) {
                    formatTemplate += `('${formatString}')`;
                }
                this.insertAtCaret(formatTemplate, this.templateInput);
            })
        })
        //attach preview generators

        document.getElementById('template-preview-generate').addEventListener('click', e => {
            e.preventDefault();
            this.generateTemplatePreview(this.templateInput.value, document.getElementById('template-preview-container'));
        });
        document.getElementById('list-template-preview-generate').addEventListener('click', e => {
            e.preventDefault();
            this.generateTemplatePreview(this.listTemplateInput.value, document.getElementById('list-template-preview-container'));
        })

        //attach auto generate template button
        document.getElementById('template-auto-generate').addEventListener('click', e => { e.preventDefault();  this.autoGenerateTemplate() })
    }

    private async getAttributesForLayer() {

        if (this.layerSourceURL !== '' && this.layerSourceName !== '') {
            let serverCapabilities = await Metadata.getBasicCapabilities(this.layerSourceURL, {}, "");

            if (serverCapabilities &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType && c.url !== '').length !== 0
            ) {
                //has all relevant capabilities
                let describeFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType)[0];
                let featureDescription = await Metadata.getDescribeFeatureType(describeFeatureCapability.url, this.layerSourceName, describeFeatureCapability.method, undefined, "");
                if (featureDescription && featureDescription.featureTypes.length === 1) {
                    return featureDescription.featureTypes[0].properties.filter(f => f.type.indexOf("gml:") === -1 && FeaturePropertiesHelper.isUserDisplayableProperty(f.name));
                }
            }
        }
    }

    private async renderAttributeLists() {
        const featureAttributes = await this.getAttributesForLayer();
        const listTemplateAttributesContainer = document.getElementById('list-template-attributes-pane');
        const templateAttributesContainer = document.getElementById('template-attributes-pane');
        if (featureAttributes && featureAttributes.length > 0) {
            featureAttributes.forEach(featureAttribute => {
                //TODO - Make less awful
                const templateAttrBtn = document.createElement('button');
                templateAttrBtn.type = 'button';
                templateAttrBtn.className = 'btn btn-outline-primary btn-sm';
                templateAttrBtn.textContent = featureAttribute.name;
                templateAttrBtn.dataset.attributeName = featureAttribute.name;
                templateAttrBtn.addEventListener('click', e => {
                    this.insertAtCaret(`{{${featureAttribute.name}}}`, this.templateInput)
                })
                const templateAttrLi = document.createElement('li');
                templateAttrLi.className = "list-inline-item";
                templateAttrLi.appendChild(templateAttrBtn);
                templateAttributesContainer.querySelector('ul').appendChild(templateAttrLi);

                const listTemplateAttrBtn = document.createElement('button');
                listTemplateAttrBtn.type = 'button';
                listTemplateAttrBtn.className = 'btn btn-outline-primary btn-sm';
                listTemplateAttrBtn.textContent = featureAttribute.name;
                listTemplateAttrBtn.dataset.attributeName = featureAttribute.name;
                listTemplateAttrBtn.addEventListener('click', e => {
                    this.insertAtCaret(`{{${featureAttribute.name}}}`, this.listTemplateInput)
                })
                const listTemplateAttrLi = document.createElement('li');
                listTemplateAttrLi.className = "list-inline-item";
                listTemplateAttrLi.appendChild(listTemplateAttrBtn);
                listTemplateAttributesContainer.querySelector('ul').appendChild(listTemplateAttrLi);
            });
            document.getElementById('template-auto-generate').style.display = '';
        } else {
            const errMsg = '<div class="alert alert-warning">We couldn\'t automatically determine the attributes available. You can insert attribute references manually using the syntax {{ATTRIBUTE}}</div>'
            templateAttributesContainer.innerHTML = errMsg;
            listTemplateAttributesContainer.innerHTML = errMsg;
        }
    }

    private async autoGenerateTemplate() {
        const attributeDetails = await this.getAttributesForLayer();
        let attributes = attributeDetails.flatMap(a => a.name);
        let template = '';
        //try and find a suitable name column
        let titleProperty = FeaturePropertiesHelper.getMostAppropriateTitleFromProperties(attributes);
        if (titleProperty) {
            template = `<h1>{{${titleProperty}}}</h1>\r`;
            //remove attribute from list
            attributes = attributes.filter(a => a != titleProperty);
        } else {
            //fall back to first property
            let firstProp = FeaturePropertiesHelper.getFirstAllowedPropertyFromProperties(attributes as unknown as object[]);
            template = `<h1>{{${firstProp[1].toString()}}}</h1>\r`;
            attributes = attributes.filter(a => a != firstProp[1].toString());
        }
        //loop through remaining properties, applying basic template
        attributes.forEach(attr => {
            template += `<p><strong>${attr}:</strong> {{${attr}}}</p>\r`;
        })
        this.templateInput.value = template;
    }

    private async generateTemplatePreview(template: string, previewContainer: HTMLElement) {
        if (template) {
            //get an example value from the service if possible.

            const props = await this.getExampleFeature();
            if (props !== null) {
                let renderedTemplate = nunjucks.renderString(template, props);
                previewContainer.innerHTML = renderedTemplate;
            } else {
                previewContainer.innerHTML = '<div class="alert alert-warning p-2 my-1">We couldn\'t get an example feature from the feature server</div>';
            }
            
        } else {
            previewContainer.innerHTML = '<div class="alert alert-warning p-2 my-1">No template defined!</div>';
        }
    }

    private async getExampleFeature() {
        if (this._cachedExampleFeature) {
            return this._cachedExampleFeature;
        }
        let serverCapabilities = await Metadata.getBasicCapabilities(this.layerSourceURL, {});

        if (serverCapabilities &&
            serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType && c.url !== '').length !== 0 &&
            serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WFS_GetFeature && c.url !== '').length !== 0
        ) {
            //has all relevant capabilities
            let describeFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType)[0];
            let featureDescription = await Metadata.getDescribeFeatureType(describeFeatureCapability.url, this.layerSourceName, describeFeatureCapability.method, undefined, "");

            let wfsFeatureInfoRequest = new WFS().writeGetFeature({
                srsName: 'EPSG:3857',
                featureTypes: [this.layerSourceName],
                featureNS: featureDescription.targetNamespace,
                featurePrefix: featureDescription.targetPrefix,
                count: 1,
                maxFeatures: 1
            });
            let getFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WFS_GetFeature)[0];
            let request: FeatureQueryRequest = {
                layer: undefined, wfsRequest: wfsFeatureInfoRequest, searchUrl: getFeatureCapability.url, searchMethod: getFeatureCapability.method
            };
            let resp = await this.getFeatureInfoForLayer(request);

            console.log(resp.features);

            const props = resp.features[0].getProperties();
            if (props) {
                this._cachedExampleFeature = props;
            }
            return props;
        }
        return null;
    }

    private getFeatureInfoForLayer(request: FeatureQueryRequest): Promise<FeatureQueryResponse> {
        let abortController = new AbortController();
        let timer = window.setTimeout(() => abortController.abort(), 10000);
        let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
            let fetchUrl = request.searchUrl;

            fetch(fetchUrl, {
                method: request.wfsRequest ? "POST" : "GET",
                mode: 'cors',
                headers: { 'Content-Type': 'application/vnd.ogc.gml' },
                body: request.wfsRequest ? new XMLSerializer().serializeToString(request.wfsRequest) : null,
                signal: abortController.signal
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                }).then(data => {
                    //if the request was a WFS, use the GML reader, else use the WMSGetFeatureInfo reader
                    let features = new GML3().readFeatures(data)

                    let response: FeatureQueryResponse = {
                        layer: request.layer,
                        features: features
                    }

                    resolve(response);
                })
                .catch(error => {
                    console.error(error);
                    reject(`Failed to get feature info for layer ${request.layer.get("name")}`);
                })
                .finally(() => {
                    window.clearTimeout(timer);
                });
        })

        return promise;
    }

    private insertAtCaret(text: string, el: HTMLInputElement|HTMLTextAreaElement) {
        const [start, end] = [el.selectionStart, el.selectionEnd];
        el.setRangeText(text, start, end, 'end');
        el.focus();
    }
}

addEventListener("DOMContentLoaded", (event) => {
    new CreateLayerFromSource().init();
});