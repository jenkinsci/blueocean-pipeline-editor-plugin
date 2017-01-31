// @flow

import React, { Component } from 'react';
import { Link } from 'react-router';
import Extensions from '@jenkins-cd/js-extensions';

function PipelineEditorButton() {
    return (
        <Link className="pipeline-editor" to="/pipelines/pipeline-editor-demo">
            <Extensions.Renderer extensionPoint="pipeline.editor.css"/>
            Pipeline Editor
        </Link>
    );
}

export default PipelineEditorButton;
