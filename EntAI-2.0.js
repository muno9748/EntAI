function loadModel(model) {
    try {
        $.get(`https://raw.githubusercontent.com/muno9748/EntAI/master/model/MODEL_${model}.js`).then(d => {
            eval('(() => {'+d+'})();');
        });
    } catch (e) {
        Entry.toast.alert('EntAI 오류','모델을 로드하던중 오류가 발생했습니다. (' + e.toString().replace(/\n/gi, ' ') + ')');
        Entry.engine.toggleStop();
        return;
    }
}
Entry.events_.showMachineLearningScreen = Entry.events_.showVideoLoadingScreen
window.EntAI_loadedPackageCount = 0;
window.EntAI_totalPackageCount = 0;
Entry.events_.showMachineLearningScreen[1] = () => {$('.description__d9e8f').html(
    `머신러닝에 필요한 도구들을 로드중입니다.<br />몇 초만 기다려 주세요.<br />${window.EntAI_loadedPackageCount} / ${window.EntAI_totalPackageCount}`
)}
(async () => {
    const MODELDATA = JSON.parse(await $.get('https://raw.githubusercontent.com/muno9748/EntAI/master/models.json'));
    if(Entry.variableContainer.getListByName('EntAI-모델')) {
        const Models = (() => {return returnvalue = {}, Object.keys(MODELDATA).map((el,i) => {return {
            [MODELDATA[el].name]:MODELDATA[el].modelname
        }}).forEach((el,i) => {
            returnvalue[Object.keys(el)[0]] = el[Object.keys(el)[0]]
        }),returnvalue})();
        var usingModels = Entry.variableContainer.getListByName('EntAI-모델').getArray().map(el => el.data);
        if(usingModels.length < 1) {
            Entry.toast.alert('EntAI 오류','모델은 적어도 1개 이상 있어야 합니다.');
            Entry.engine.toggleStop();
        }
        var temp_isreturn = false;
        usingModels.forEach(el => {
            if(Object.keys(Models).indexOf(el.replace(/ /gi,'')) == -1) {
                Entry.toast.alert('EntAI 오류','모델을 찾을수 없습니다. 현재 있는 모델들: ' + Object.keys(Models).join(', '));
                Entry.engine.toggleStop();
                temp_isreturn = true;
            }
        });
        if(temp_isreturn) return;
        const modelParams = (() => {return returnvalue = {}, Object.keys(MODELDATA).map((el,i) => {return {
            [MODELDATA[el].modelname]:MODELDATA[el].modelParams
        }}).forEach((el,i) => {
            returnvalue[Object.keys(el)[0]] = el[Object.keys(el)[0]]
        }),returnvalue})();
        const modelDatas = (() => {return returnvalue = {}, Object.keys(MODELDATA).map((el,i) => {return {
            [MODELDATA[el].modelname]:MODELDATA[el].modelDatas
        }}).forEach((el,i) => {
            returnvalue[Object.keys(el)[0]] = el[Object.keys(el)[0]]
        }),returnvalue})();
        const modelScriptUrls = (() => {return returnvalue = {}, Object.keys(MODELDATA).map((el,i) => {return {
            [MODELDATA[el].modelname]:MODELDATA[el].modelScriptUrls
        }}).forEach((el,i) => {
            returnvalue[Object.keys(el)[0]] = el[Object.keys(el)[0]]
        }),returnvalue})();
        const modelScript = (() => {return returnvalue = {}, Object.keys(MODELDATA).map((el,i) => {return {
            [MODELDATA[el].modelname]:MODELDATA[el].script
        }}).forEach((el,i) => {
            returnvalue[Object.keys(el)[0]] = el[Object.keys(el)[0]]
        }),returnvalue})();
        window.EntAI_loadedPackageCount = 0;
        window.EntAI_totalPackageCount = usingModels.length;
        $.getScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs').then(() => {
            usingModels.forEach(el => {
                Entry.dispatchEvent('showMachineLearningScreen');
                try {
                    console.log(modelScriptUrls[Models[el]]);
                    if(!(modelScript[Models[el]])) {
                        $.getScript(modelScriptUrls[Models[el]], () => {
                            if(modelParams[Models[el]] != null) {
                                window[Models[el]].load(modelParams[Models[el]]).then(model => {
                                    window[modelDatas[Models[el]]] = model;
                                    loadModel(Models[el]);
                                    window.EntAI_loadedPackageCount++;
                                    Entry.events_.showMachineLearningScreen[1]();
                                    if(window.EntAI_loadedPackageCount == window.EntAI_totalPackageCount) {
                                        Entry.dispatchEvent('hideLoadingScreen')
                                    }
                                });
                            } else {
                                window[Models[el]].load().then(model => {
                                    window[modelDatas[Models[el]]] = model;
                                    loadModel(Models[el]);
                                    window.EntAI_loadedPackageCount++;
                                    Entry.events_.showMachineLearningScreen[1]();
                                    if(window.EntAI_loadedPackageCount == window.EntAI_totalPackageCount) {
                                        Entry.dispatchEvent('hideLoadingScreen')
                                    }
                                });
                            }
                        });
                    } else {
                        $.get(modelScript[Models[el]]).then(GetRequestData => {
                            eval(GetRequestData);
                        });
                    }
                } catch (e) {
                    Entry.toast.alert('EntAI 오류','알수없는 오류가 발생했습니다. (' + e.toString().replace(/\n/gi, ' ') + ')');
                    Entry.engine.toggleStop();
                    return;
                }
            });
        });
    } else {
        Entry.toast.alert('EntAI 오류','"EntAI-모델" 리스트가 필요합니다.');
        Entry.engine.toggleStop();
    }
})();
