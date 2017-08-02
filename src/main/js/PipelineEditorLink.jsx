// @flow

import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import { Icon } from '@jenkins-cd/react-material-icons';
import { Paths, pipelineService, capabilityAugmenter } from '@jenkins-cd/blueocean-core-js';
import Security from './services/Security';
import { action } from 'mobx';

class PipelineEditorLink extends React.Component {
    state = {};

    componentWillMount() {
        this._loadPipeline();
    }

    render() {
        if (!Security.isCreationEnabled()) {
            return null;
        }

        if (!this.state.supportsSave) {
            return <div/>;
        }

        const { run, pipeline } = this.props;
        const pipelinePath = pipeline.fullName.split('/');
        const branch = run ? run.pipeline : pipelinePath[pipelinePath.length - 1];
        // this shows up in the branches table, each pipeline.fullName includes the branch
        // if it's not on the branches table, branch is in the run
        if (!run) {
            pipelinePath.splice(-1);
        }
        const baseUrl = `/organizations/${pipeline.organization}/pipeline-editor/${encodeURIComponent(pipelinePath.join('/'))}/${branch}/`;

        return (
            <Link className="pipeline-editor-link" to={baseUrl}>
                <Icon icon="mode_edit" style={{ fill: run ? '#fff' : '#4A90E2' }} />
            </Link>
        );
    }

    @action
    _loadPipeline() {
        const { pipeline } = this.props;
        const folder = pipeline.fullName.split('/')[0];
        const href = Paths.rest.apiRoot() + '/organizations/' + pipeline.organization + '/pipelines/' + folder + '/';
        pipelineService.fetchPipeline(href, { useCache: true, disableCapabilites: false })
            .then(pipeline => {
                if (pipeline._capabilities &&
                    pipeline._capabilities
                        .find(capability => capability === 'io.jenkins.blueocean.rest.model.BluePipelineScm')){
                    this.setState({ supportsSave: true });
                }
            });
    }
}

PipelineEditorLink.propTypes = {
    run: PropTypes.object,
    pipeline: PropTypes.object,
};

export default PipelineEditorLink;
