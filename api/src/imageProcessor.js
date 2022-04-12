const { resolve } = require('path');
const path = require('path');
const {Worker, isMainThread} = require("worker_threads");

const pathToResizeWorker = path.resolve(__dirname, 'resizeWorker.js');
const pathToMonochromeWorker = path.resolve(__dirname, 'monochromeWorker.js');

function uploadPathResolver(filename) {
    return path.resolve(__dirname, '../uploads', filename);
}



function imageProcessor(filename) {
    const sourcePath = uploadPathResolver(filename);
    const resizedDestination = uploadPathResolver('resized-'+filename);
    const monochromeDestination = uploadPathResolver('monochrome-'+filename);
    let resizedWorkerFinished = false; 
    let monochromeWorkerFinished = false;
    
    return new Promise((res, rej) =>{
        if(isMainThread) {
            try {
                const resizeWorker = new Worker(pathToResizeWorker, {workerData: {source: sourcePath, destination: resizedDestination}});
                const monochromeWorker = new Worker(pathToMonochromeWorker, {workerData: {source: sourcePath, destination: monochromeDestination}});


                resizeWorker.on('message', (message) => {
                    resizedWorkerFinished = true;
                    if(monochromeWorkerFinished) {
                        res('resizeWorker finished processing');
                    }
                })
                resizeWorker.on('error', (error)=> {
                    rej(new Error(error.message));
                })
                resizeWorker.on('exit', (code)=> {
                    if(code!==0) {
                        rej(new Error('Exited with status code '+code));
                    }
                })

                monochromeWorker.on('message', (message) => {
                    monochromeWorkerFinished = true;
                    if(resizedWorkerFinished) {
                        res('monochromeWorker finished processing');
                    }
                })

                monochromeWorker.on('error', (error)=> {
                    rej(new Error(error.message));
                })
                monochromeWorker.on('exit', (code)=> {
                    if(code!==0) {
                        rej(new Error('Exited with status code '+code));
                    }
                })

            }
            catch{
                rej(error);
            }
        }
        else {
            rej(new Error('not on main thread'));
        }
        
    });
};

module.exports = imageProcessor;