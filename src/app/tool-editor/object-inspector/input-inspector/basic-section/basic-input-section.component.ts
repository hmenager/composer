import {Component, forwardRef, Input, ViewEncapsulation} from "@angular/core";
import {
    ControlValueAccessor,
    FormBuilder,
    FormControl,
    FormGroup,
    NG_VALUE_ACCESSOR,
    Validators
} from "@angular/forms";
import {CommandInputParameterModel} from "cwlts/models";
import {DirectiveBase} from "../../../../util/directive-base/directive-base";
import {noop} from "../../../../lib/utils.lib";

@Component({
    encapsulation: ViewEncapsulation.None,

    selector: "ct-basic-input-section",
    styleUrls: ["./basic-input-section.component.scss"],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => BasicInputSectionComponent),
            multi: true
        }
    ],
    template: `
        <form class="ct-basic-input-section">

            <!--Required-->
            <div class="form-group flex-container">
                <label>Required</label>
                <span class="align-right">
                        <ct-toggle-slider [formControl]="form.controls['isRequired']"
                                          [off]="'No'"
                                          [on]="'Yes'"
                                          [readonly]="readonly">
                        </ct-toggle-slider>
                    </span>
            </div>

            <!--ID-->
            <div class="form-group">
                <label class="form-control-label">ID</label>
                <input type="text"
                       class="form-control"
                       [formControl]="form.controls['id']">
            </div>

            <!--Input Type -->
            <input-type-select [formControl]="form.controls['typeForm']"></input-type-select>

            <!--Symbols-->
            <symbols-section class="form-group"
                             *ngIf="isType('enum')"
                             [formControl]="form.controls['symbols']"
                             [readonly]="readonly">
            </symbols-section>

            <!--Include in command line -->
            <div class="form-group flex-container"
                 *ngIf="!isType('map') && form.controls['isBound']">
                <label>Include in command line</label>
                <span class="align-right">
                        <ct-toggle-slider [formControl]="form.controls['isBound']"
                                          [off]="'No'"
                                          [on]="'Yes'"
                                          [readonly]="readonly">
                        </ct-toggle-slider>
                    </span>
            </div>

            <!--Input Binding-->
            <input-binding-section *ngIf="input.isBound"
                                   [context]="context"
                                   [propertyType]="input.type.type"
                                   [readonly]="readonly"
                                   [formControl]="form.controls['inputBinding']">
            </input-binding-section>

            <ct-secondary-file *ngIf="isType('File') && form.controls['secondaryFiles']"
                               [formControl]="form.controls['secondaryFiles']"
                               [context]="context"
                               [readonly]="readonly">
            </ct-secondary-file>
        </form>
    `
})
export class BasicInputSectionComponent extends DirectiveBase implements ControlValueAccessor {

    @Input()
    public context: { $job?: any, $self?: any } = {};

    @Input()
    public readonly = false;

    /** The currently displayed property */
    public input: CommandInputParameterModel;

    public form: FormGroup;

    private onTouched = noop;

    private propagateChange = noop;

    constructor(private formBuilder: FormBuilder) {
        super();
    }

    writeValue(input: CommandInputParameterModel): void {
        this.input = input;

        this.form = this.formBuilder.group({
            id: [{value: this.input.id, disabled: this.readonly}],
            typeForm: [{value: this.input.type, disabled: this.readonly}, [Validators.required]],
            isBound: [this.input.isBound],
            isRequired: [!this.input.type.isNullable],
            inputBinding: [this.input],
            symbols: [this.input.type.symbols ? this.input.type.symbols : []]
        });

        // fetch secondaryFiles depending on their location
        if (this.input.inputBinding.hasSecondaryFiles) {
            this.form.addControl("secondaryFiles", new FormControl(this.input.inputBinding.secondaryFiles));
        } else if (this.input.hasSecondaryFiles) {
            this.form.addControl("secondaryFiles", new FormControl(this.input.secondaryFiles));
        }

        // track separately because it causes changes to the rest of the form
        this.listenToIsBoundChanges();

        this.tracked = this.form.valueChanges.subscribe(value => {
            // nullable changes
            this.input.type.isNullable = !value.isRequired;

            // symbols changes
            if (value.symbols.length > 0 && this.isType("enum")) {
                this.input.type.symbols = value.symbols;
            }

            // binding changes
            if (value.inputBinding) {
                this.input.updateInputBinding(value.inputBinding.inputBinding);
                Object.assign(this.input.customProps, value.inputBinding.customProps);
            }

            // id changes
            if (this.input.id !== value.id) {
                this.input.id = value.id;

                if (this.isType("enum") || this.isType("record")) {
                    this.input.type.name = value.id;
                }
            }

            // secondaryFiles changes
            if(value.secondaryFiles) {
                if (value.secondaryFiles && this.input.inputBinding.hasSecondaryFiles) {
                    this.input.inputBinding.secondaryFiles = value.secondaryFiles;
                } else if (value.secondaryFiles && this.input.hasSecondaryFiles) {
                    this.input.secondaryFiles = value.secondaryFiles;
                }
            }

            // type changes
            if (value.type) {
                this.input.type.setType(value.type.type);

                if (value.type.type !== "array" && this.input.isBound) {
                    this.input.inputBinding.itemSeparator = undefined;
                }

                if (this.isType("map") && this.input.isBound) {

                    this.input.removeInputBinding();
                    this.form.controls["isBound"].setValue(this.input.isBound);
                }

                if (!!value.type.items && this.input.type.type === "array") {
                    this.input.type.items = value.type.items;
                }

                if (this.isType("enum") || this.isType("record")) {
                    this.input.type.name = this.input.id;
                }
            }

            this.input.validate();
            this.propagateChange(this.input);
        });
    }

    registerOnChange(fn: any): void {
        this.propagateChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    private listenToIsBoundChanges(): void {
        this.tracked = this.form.controls["isBound"].valueChanges.subscribe((isBound: boolean) => {
            if (isBound) {
                this.input.createInputBinding();
                this.form.setControl("inputBinding", new FormControl(this.input));
            } else {
                this.input.removeInputBinding();
                this.form.removeControl("inputBinding");
            }
        });
    }

    private isType(type: string) {
        return this.input.type.type === type || this.input.type.items === type;
    }
}
