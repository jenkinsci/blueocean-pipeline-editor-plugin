// @flow

import React, { Component, PropTypes } from 'react';
import { Dialog } from '@jenkins-cd/design-language';
import pipelineStore from '../../services/PipelineStore';
import { convertInternalModelToJson, convertJsonToPipeline, convertPipelineToJson, convertJsonToInternalModel } from '../../services/PipelineSyntaxConverter';

type Props = {
    title?: string,
    children: Component<*,*,*>[],
    style?: ?Object,
};

type State = {
    showPipelineScript?: boolean,
    pipelineScript?: string,
    pipelineErrors?: ?string[],
};

type DefaultProps = typeof EditorPage.defaultProps;

export class EditorPage extends Component<DefaultProps, Props, State> {

    static defaultProps = {
        children: (null: any)
    };

    static propTypes = {
        title: PropTypes.string,
        children: PropTypes.array,
        style: PropTypes.object,
    };

    state:State = {};

    updateStateFromPipelineScript(pipeline: string) {
        convertPipelineToJson(pipeline, (p, err) => {
            if (!err) {
                const internal = convertJsonToInternalModel(p);
                this.setState({showPipelineScript: false, pipelineErrors: null}),
                pipelineStore.setPipeline(internal);
            } else {
                this.setState({pipelineErrors: err});
            }
        });
    }

    showPipelineScriptDialog() {
        if (pipelineStore.pipeline) {
            const json = convertInternalModelToJson(pipelineStore.pipeline);
            convertJsonToPipeline(JSON.stringify(json), (result, err) => {
                if (!err) {
                    this.setState({showPipelineScript: true, pipelineErrors: null, pipelineScript: result});
                } else {
                    this.setState({showPipelineScript: true, pipelineErrors: err});
                }
            });
        } else {
            this.setState({showPipelineScript: true});
        }
    }

    render() {

        let {title = "Create Pipeline", style} = this.props;

        return (
            <div className="editor-page-outer" style={style}>
                <div className="editor-page-header">
                    <h3>{ title }</h3>
                    <div className="editor-page-header-controls">
                        <button className="btn inverse" onClick={() => this.showPipelineScriptDialog()}>Load/Save</button>
                    </div>
                </div>
                {this.props.children}
                {this.state.showPipelineScript &&
                    <Dialog className="editor-pipeline-dialog" onDismiss={() => this.setState({showPipelineScript: false})}
                        title="Pipeline Script"
                        buttons={<div><button onClick={e => this.updateStateFromPipelineScript(this.refs.pipelineScript.value)}>Update</button></div>}>
                        {this.state.pipelineErrors &&
                            <div className="errors">
                                {this.state.pipelineErrors.map(err => <div className="error">{err}</div>)}
                            </div>
                        }
                        <div className="editor-text-area">
                            <textarea ref="pipelineScript" style={{width: "100%", minHeight: "30em", height: "100%"}} defaultValue={this.state.pipelineScript}/>
                        </div>
                    </Dialog>
                }
            </div>
        );
    }
}

export default EditorPage;
