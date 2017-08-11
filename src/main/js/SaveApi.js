// @flow

import { Fetch, getRestUrl, sseService, loadingIndicator } from '@jenkins-cd/blueocean-core-js';

export class SaveApi {

    indexRepo(organization, teamName, repoName, scmId, apiUrl) {
        const createUrl = `${getRestUrl({organization})}/pipelines/`;

        const requestBody = {
            name: teamName,
            $class: 'io.jenkins.blueocean.blueocean_github_pipeline.GithubPipelineCreateRequest',
            scmConfig: {
                id: scmId,
                uri: apiUrl,
                config: {
                    orgName: teamName,
                    repos: [repoName],
                },
            },
        };

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        };

        return Fetch.fetchJSON(createUrl, { fetchOptions });
    }

    index(organization, folder, repo, apiUrl, credentialId, complete, onError, progress) {
        const cleanup = err => {
            sseService.removeHandler(sseId);
            clearTimeout(timeoutId);
            loadingIndicator.hide();
            if (err && onError) {
                onError(err);
            } else {
                complete();
            }
        };
        
        loadingIndicator.show();
        
        const timeoutId = setTimeout(() => {
            cleanup();
        }, 60*1000);
        
        const sseId = sseService.registerHandler(event => {
            if (event.job_multibranch_indexing_result === 'SUCCESS') {
                cleanup();
            }
            if (event.job_multibranch_indexing_result === 'FAILURE') {
                cleanup({ message: 'Indexing failed' });
            }
        });

        this.indexRepo(organization, folder, repo, apiUrl, credentialId);
    }
}

const saveApi = new SaveApi();

export default saveApi;
