
    var blockidTemp = _.find(Entry.variableContainer.functions_,
        d => d.block.template.replace(/ /gi,'') == '%1텍스트에서욕설체크%2');
    if(!blockidTemp) {
        Entry.toast.alert('EntAI 오류','"(문자/숫자값)텍스트에서 욕설 체크" 함수가 필요합니다.');
        Entry.engine.toggleStop();
        return;
    }
    const blockId = blockidTemp.id;

    Entry.block[`func_${blockId}`].paramsKeyMap = { OBJECT: 0 };
    Entry.block[`func_${blockId}`].func = async (sprite, script) => {
        try {
            if(Entry.variableContainer.getListByName('EntAI-욕설체크')) {
                if (_.find(Entry.variableContainer.messages_, d => d.name == '욕설체크완료')) {
                    var resultData = (await (async () => {return returnvalue = {},(await toxicityModel.classify([script.getStringValue('OBJECT',script)])).map(el => {
                        const filter = {
                            identity_attack: '정체성 공격',
                            insult: '모욕',
                            obscene: '외설적 발언',
                            severe_toxicity: '심한 욕설',
                            sexual_explicit: '성적 발언',
                            threat: '협박',
                            toxicity: '무례함'
                        };
                        returnvalue[filter[el.label]] = el.results[0].match == null ? false : el.results[0].match
                    }),returnvalue;})());
                    Entry.variableContainer.getListByName('EntAI-욕설체크').getArray().forEach(() => {
                        Entry.variableContainer.getListByName('EntAI-욕설체크').deleteValue(1);
                    });
                    Object.keys(resultData).forEach(el => {
                        Entry.variableContainer.getListByName('EntAI-욕설체크').appendValue(`${el}: ${resultData[el] ? '감지됨' : '통과'}`);
                    });
                    Entry.engine.raiseMessage(_.find(Entry.variableContainer.messages_, d => d.name == '욕설체크완료').id);
                } else {
                    Entry.toast.alert('EntAI 오류','"욕설체크완료" 신호가 필요합니다.');
                    Entry.engine.toggleStop();
                    return;
                }
            } else {
                Entry.toast.alert('EntAI 오류','"EntAI-욕설체크" 리스트가 필요합니다.');
                Entry.engine.toggleStop();
                return;
            }
        } catch (e) {
            Entry.toast.alert('EntAI 오류','알수없는 오류가 발생했습니다. (' + e.toString().replace(/\n/gi, ' ') + ')');
            Entry.engine.toggleStop();
            return;
        }
    };
