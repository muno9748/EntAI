function loadComplete() {
    Entry.dispatchEvent('hideLoadingScreen');
    var blockidTemp = _.find(Entry.variableContainer.functions_,
        d => d.block.template.replace(/ /gi,'') == '%1의이미지감지%2');
    if(!blockidTemp) {
        Entry.toast.alert('EntAI 오류','"(문자/숫자값)의 이미지 감지" 함수가 필요합니다.');
        Entry.engine.toggleStop();
        return;
    }
    const blockId = blockidTemp.id;

    Entry.block[`func_${blockId}`].paramsKeyMap = { OBJECT: 0 };
    Entry.block[`func_${blockId}`].func = (sprite, script) => {
        console.log(sprite.picture);
        const objectName = script.getValue('OBJECT',script);
        var findedObject = _.find(Entry.container.objects_, d => d.name == objectName);
        var objectMatchCounts = 0;
        Entry.container.objects_.forEach((d,i) => {
            if(d.name == objectName) ++objectMatchCounts;
        });
        if(objectMatchCounts > 1 && objectName != '자신') {
            Entry.toast.alert('EntAI 오류','같은 오브젝트가 2개 이상 있습니다.');
            Entry.engine.toggleStop();
            return;
        }
        if(findedObject == undefined && objectName != '자신') {
            Entry.toast.alert('EntAI 오류','오브젝트를 찾을수 없습니다.');
            Entry.engine.toggleStop();
            return;
        } else if (objectName == '자신') {
            findedObject = sprite.parent;
        }
        if(typeof mobilenet == 'undefined' || typeof tf == 'undefined' || !mobileNetModel) {
            Entry.toast.alert('EntAI 오류','필요한 라이브러리를 찾을수 없습니다');
            Entry.engine.toggleStop();
            return;
        }
        try {
            if(sprite.picture.fileurl) {
                const id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/gi, txt=>{return Math.floor(Math.random() * 16).toString(16);});
                $(document.body).append(`<img src="${sprite.picture.fileurl}" id="machineLearning_${id}" class="entryRemove" />`);
                mobileNetModel.classify($(`#machineLearning_${id}`)[0]).then(predictions => {
                    console.log('Predictions: ');
                    console.table(predictions);
                    if(_.find(Entry.variableContainer.messages_, d => d.name == '감지완료')) {
                        if(!Entry.variableContainer.getListByName('EntAI-정확도') || !Entry.variableContainer.getListByName('"EntAI-데이터')) {
                            const list = {
                                className: Entry.variableContainer.getListByName('EntAI-데이터'),
                                probability: Entry.variableContainer.getListByName('EntAI-정확도')
                            };
                            list.className.getArray().forEach(() => {
                                list.className.deleteValue(1);
                            });
                            list.probability.getArray().forEach(() => {
                                list.probability.deleteValue(1);
                            });
                            predictions.forEach(el => {
                                list.className.appendValue(el.className);
                                list.probability.appendValue((String(el.probability * 100).substr(0,String(el.probability * 100).indexOf('.') + 3)) + "%");
                            });
                            Entry.engine.raiseMessage(_.find(Entry.variableContainer.messages_, d => d.name == '감지완료').id);
                        } else {
                            Entry.toast.alert('EntAI 오류','"EntAI-정확도"와 "EntAI-데이터" 리스트가 필요합니다.');
                            Entry.engine.toggleStop();
                            return;
                        }
                    } else {
                        Entry.toast.alert('EntAI 오류','"감지완료" 신호가 필요합니다.');
                        Entry.engine.toggleStop();
                        return;
                    }
                });
                //$(`#machineLearning_${id}`).remove();
            } else if (sprite.picture.filename){
                const filename = sprite.picture.filename;
                $(document.body).append(`<img src="/uploads/${filename.substr(0,2)}/${filename.substr(2,2)}/thumb/${filename}.png" id="machineLearning_${filename}" class="entryRemove" />`);
                mobileNetModel.classify($(`#machineLearning_${filename}`)[0]).then(predictions => {
                    console.log('Predictions: ');
                    console.table(predictions);
                    if(_.find(Entry.variableContainer.messages_, d => d.name == '감지완료')) {
                        if(!Entry.variableContainer.getListByName('EntAI-정확도') || !Entry.variableContainer.getListByName('"EntAI-데이터')) {
                            const list = {
                                className: Entry.variableContainer.getListByName('EntAI-데이터'),
                                probability: Entry.variableContainer.getListByName('EntAI-정확도')
                            };
                            list.className.getArray().forEach(() => {
                                list.className.deleteValue(1);
                            });
                            list.probability.getArray().forEach(() => {
                                list.probability.deleteValue(1);
                            });
                            predictions.forEach(el => {
                                list.className.appendValue(el.className);
                                list.probability.appendValue((String(el.probability * 100).substr(0,String(el.probability * 100).indexOf('.') + 3)) + "%");
                            });
                            Entry.engine.raiseMessage(_.find(Entry.variableContainer.messages_, d => d.name == '감지완료').id);
                        } else {
                            Entry.toast.alert('EntAI 오류','"EntAI-정확도"와 "EntAI-데이터" 리스트가 필요합니다.');
                            Entry.engine.toggleStop();
                            return;
                        }
                    } else {
                        Entry.toast.alert('EntAI 오류','"감지완료" 신호가 필요합니다.');
                        Entry.engine.toggleStop();
                        return;
                    }
                });
                //$(`#machineLearning_${filename}`).remove();
            } else {
                Entry.toast.alert('EntAI 오류','알수없는 오류가 발생했습니다.');
                Entry.engine.toggleStop();
                return;
            }
        } catch (e) {
                Entry.toast.alert('EntAI 오류','알수없는 오류가 발생했습니다. (' + e.toString().replace(/\n/gi, ' ') + ')');
                Entry.engine.toggleStop();
                return;
        }
    }
}
Entry.events_.showMachineLearningScreen = Entry.events_.showVideoLoadingScreen
Entry.events_.showMachineLearningScreen[1] = () => {$('.description__d9e8f').html('머신러닝에 필요한 도구들을 로드중입니다.<br />몇 초만 기다려 주세요.')}
Entry.dispatchEvent('showMachineLearningScreen');
let mobileNetModel;
if(typeof mobilenet == 'undefined' || typeof tf == 'undefined') {
    try {
        $.getScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.0.1" , () => {
            $.getScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@1.0.0", () => {
                mobilenet.load().then(model => {
                    mobileNetModel = model;
                    loadComplete();
                });
            });
        });
    } catch (e) {
        Entry.toast.alert('EntAI 오류','알수없는 오류가 발생했습니다. (' + e.toString().replace(/\n/gi, ' ') + ')');
        Entry.engine.toggleStop();
    }
} else {
    mobilenet.load().then(model => {
        mobileNetModel = model;
        loadComplete();
    });
}
