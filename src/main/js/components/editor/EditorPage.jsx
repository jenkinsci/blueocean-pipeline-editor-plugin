// @flow

import React, { Component, PropTypes } from 'react';
import { Dialog } from '@jenkins-cd/design-language';
import pipelineStore from '../../services/PipelineStore';

type Props = {
    title?: string,
    children: Component<*,*,*>[],
    style?: ?Object,
};

type State = {
    showPipelineScript?: boolean,
    pipelineScript?: string,
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

    updateStateFromPipelineScript(script: string) {
        pipelineStore.updateStateFromPipelineScript(this.refs.pipelineScript.value);
        this.setState({showPipelineScript: false});
    }

    render() {

        let {title = "Create Pipeline", style} = this.props;

        return (
            <div className="editor-page-outer" style={style}>
                <div className="editor-page-header">
                    <h3>{ title }</h3>
                    <div className="editor-page-header-controls">
                        <button className="btn-secondary inverse">Discard Changes</button>
                        <button className="btn inverse">Save</button>
                        <button onClick={() => this.setState({showPipelineScript: true})}>Show Pipeline Script</button>
                    </div>
                </div>
                {this.props.children}
                {this.state.showPipelineScript &&
                    <Dialog className="editor-pipeline-dialog" onDismiss={() => this.setState({showPipelineScript: false})}
                        title="Pipeline Script"
                        buttons={<div><button onClick={e => this.updateStateFromPipelineScript(this.refs.pipelineScript.value)}>Update</button></div>}>
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
