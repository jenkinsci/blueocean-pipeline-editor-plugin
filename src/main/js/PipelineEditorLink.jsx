// @flow

import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import { Icon } from '@jenkins-cd/react-material-icons';

function PipelineEditorLink(props, context) {
    let { baseUrl, run, back } = props;
    if (!baseUrl) { // called from 
        baseUrl = props.pipeline.fullName.split('/');
        const branch = run ? run.pipeline : baseUrl[2];
        baseUrl = `/organizations/${props.pipeline.organization}/pipeline-editor/${encodeURIComponent(baseUrl[0]+'/'+baseUrl[1])}/${branch}`;
        back = context.router.location;
    }
    return (
        <Link className="pipeline-editor-link" to={baseUrl}>
            <Icon icon="mode_edit" style={{ fill: run ? '#fff' : '#4A90E2' }} />
        </Link>
    );
}

PipelineEditorLink.propTypes = {
    run: PropTypes.object,
    back: PropTypes.function,
};

PipelineEditorLink.contextTypes = {
    router: PropTypes.object,
};

export default PipelineEditorLink;
