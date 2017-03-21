import {Component, Input, Output, ViewChild, EventEmitter} from "@angular/core";
import {DirectiveBase} from "../../../util/directive-base/directive-base";
import {CommandInputParameterModel, CommandLineToolModel} from "cwlts/models";
import {ToolInputListComponent} from "./tool-input-list.component";

@Component({
    selector: "ct-tool-input",
    styleUrls: ["./tool-inputs.component.scss"],
    template: `
        <ct-form-panel [collapsed]="false">
            <span class="tc-header">
                Input ports
            </span>

            <div class="tc-body">

                <!--Blank Tool Screen-->
                <ct-blank-tool-state *ngIf="!readonly && !model?.inputs.length"
                                     [title]="'Files, parameters, and other stuff displayed in the tools command line'"
                                     [buttonText]="'Add an Input'"
                                     (buttonClick)="addEntry()">
                </ct-blank-tool-state>

                <!--List of entries-->
                <ct-tool-input-list [(entries)]="model.inputs"
                                    (entriesChange)="update.emit($event)"
                                    [location]="location"
                                    [parent]="model"
                                    [context]="context"
                                    [readonly]="readonly">
                </ct-tool-input-list>

            </div>
        </ct-form-panel>
    `
})
export class ToolInputsComponent extends DirectiveBase {

    @Input()
    public entries: CommandInputParameterModel[] = [];

    /** Model location entry, used for tracing the path in the json document */
    @Input()
    public location = "";

    /** Context in which expression should be evaluated */
    @Input()
    public context: { $job: any };

    @Input()
    public readonly = false;

    @Input()
    public model: CommandLineToolModel;

    @Output()
    public update = new EventEmitter();


    @ViewChild(ToolInputListComponent) inputList: ToolInputListComponent;

    private addEntry() {
        this.inputList.addEntry();
    }

}
