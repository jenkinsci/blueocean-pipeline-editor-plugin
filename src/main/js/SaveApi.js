// @flow

import { action, computed, observable } from 'mobx';
import { Fetch, Paths, sseService, loadingIndicator } from '@jenkins-cd/blueocean-core-js';

export class SaveApi {
    index(organization, folder, complete, progress) {
        const cleanup = e => {
            sseService.removeHandler(sseId);
            clearTimeout(timeoutId);
            complete();
            loadingIndicator.hide();
        };
        
        loadingIndicator.show();
        
        const timeoutId = setTimeout(() => {
            cleanup();
        }, 60*1000);
        
        const sseId = sseService.registerHandler(event => {
            if (event.job_multibranch_indexing_result === 'SUCCESS') {
                if (progress) progress(event);
            }
            if (event.job_orgfolder_indexing_result === 'FAILURE' || event.job_orgfolder_indexing_result === 'SUCCESS') {
                cleanup();
            }
        });

        Fetch.fetchJSON(Paths.rest.apiRoot() + '/organizations/' + organization + '/pipelines/' + folder + '/runs/1/replay/', {
        	fetchOptions: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: '{}',
            }
        })
        .then(data => {
            console.log(data);
        })
        .catch(err => {
        	console.error(err);
        });
    }
}

const saveApi = new SaveApi();

export default saveApi;
