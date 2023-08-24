import { FeaturePropertiesHelper } from "../FeatureQuery/FeaturePropertiesHelper";
import { CapabilityType } from "../Interfaces/OGCMetadata/BasicServerCapabilities";
import { Metadata } from "../Metadata/Metadata";

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
    constructor() {
        this.templateInput = document.querySelector('textarea[data-template-target]') as HTMLTextAreaElement;
        this.listTemplateInput = document.querySelector('input[data-list-template-target]') as HTMLInputElement;
    }

    public async init() {
        await this.renderAttributeLists();
        //attach HTML tag buttons
        document.querySelectorAll('#template-html-tags-pane button').forEach(btn => {
            btn.addEventListener('click', e => {
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
        //attach attribute buttons

        //attach date formatting helper buttons

        //attach preview generators

        //attach auto generate template button
        document.getElementById('template-auto-generate').addEventListener('click', e => { e.preventDefault();  this.autoGenerateTemplate() })
    }

    private async getAttributesForLayer() {
        const layerSourceURL = (document.getElementById('layer-source-url') as HTMLInputElement).value;
        const layerSourceName = (document.getElementById('layer-source-name') as HTMLInputElement).value;
        if (layerSourceURL !== '' && layerSourceName !== '') {
            let serverCapabilities = await Metadata.getBasicCapabilities(layerSourceURL, {}, "");

            if (serverCapabilities &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType && c.url !== '').length !== 0 &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WFS_GetFeature && c.url !== '').length !== 0
            ) {
                //has all relevant capabilities
                let describeFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType)[0];
                let featureDescription = await Metadata.getDescribeFeatureType(describeFeatureCapability.url, layerSourceName, describeFeatureCapability.method, undefined, "");
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

    private insertAtCaret(text: string, el: HTMLInputElement|HTMLTextAreaElement) {
        const [start, end] = [el.selectionStart, el.selectionEnd];
        el.setRangeText(text, start, end, 'end');
        el.focus();
    }
}

addEventListener("DOMContentLoaded", (event) => {
    new CreateLayerFromSource().init();
});