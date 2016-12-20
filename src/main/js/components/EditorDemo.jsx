// @flow

import React, { Component, PropTypes } from 'react';
import { EditorPage } from './editor/EditorPage';
import { EditorMain } from './editor/EditorMain';
import Extensions from '@jenkins-cd/js-extensions';

import type {StepInfo, StageInfo} from './editor/common';

const pageStyles = {
    display: "flex",
    width: "100%",
    height: "100%"
};

/// Simple helpers for data generation

var __id = 1;

function makeStage(name, children = []):StageInfo {
    const id = __id++;
    return {name, children, id, steps: []};
}

function makeStep(type:string, label:string, nestedSteps?:Array<StepInfo>):StepInfo {
    const id = __id++;
    const children = nestedSteps || [];
    const isContainer = !!children.length;
    const data = {}; // TODO: Put stuff here at some point
    return {
        id,
        type,
        label,
        isContainer,
        children,
        data
    };
}

/**
 This is basically adapted from the Storybooks entry, for the purposes of connecting a demo into the main appendEvent
 */
export class EditorDemo extends Component {
    state: { pipeline?: StageInfo } = {};
    constructor() {
        super();
        this.loadWorkingPipeline();
    }
    loadWorkingPipeline() {
        let workingCopy: any = localStorage.getItem('workingPipeline');
        if (workingCopy) {
            workingCopy = JSON.parse(workingCopy);
        }
        else {
            let bt = [
                makeStage("Firefox"),
                makeStage("Safari"),
                makeStage("Chrome"),
                makeStage("Internet Explorer"),
            ];

            let stages = [
                makeStage("Build"),
                makeStage("Browser Tests", bt),
                makeStage("Static Analysis"),
                makeStage("Package"),
            ];

            stages[stages[0].id] = [makeStep("sh", "Run Script")];
            stages[0].steps = [
                makeStep("sh", "Run Script"),
                makeStep("sh", "Run Script")
            ];

            let pipe = makeStage('pipeline');
            pipe.children = stages;
            workingCopy = pipe;
        }
        this.setState({ pipeline: workingCopy });
    }
    render() {
        return (
            <EditorPage style={pageStyles}>
                <Extensions.Renderer extensionPoint="pipeline.editor.css"/>
                <EditorMain pipeline={this.state.pipeline}/>
            </EditorPage>
        );
    }
}

export default EditorDemo;
