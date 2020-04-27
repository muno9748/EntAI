/**
 * EntAI 3.0 By muno9748
 * Block Handler Code
 * Copyright 2020. EntAI All Rights Reserved.
**/

$.getScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet", () => {
    $.getScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier", () => {
        mobilenet.load().then(model => {
            window.knnMobilenet = model;
            window.knn = knnClassifier;
            initKNN();
            window.EntAI_loadedPackageCount++;
            Entry.events_.showMachineLearningScreen[1]();
            if(window.EntAI_loadedPackageCount == window.EntAI_totalPackageCount) {
                Entry.dispatchEvent('hideLoadingScreen')
            }
        });
    });
});
function initKNN() {
    if (Entry.variableContainer.getVariableByName('EntAI-학습'))
        Entry.variableContainer.setVariables([{name:'EntAI-학습',value:'{}',visible:false}]);
    window.detectImageBlockResult = null;
    function checkFunction(template) {
        var check = _.find(Entry.variableContainer.functions_,
            d => d.block.template.replace(/ /gi,'') == template.replace(/ /gi,''));
        return check ? check : false;
    }
    function modelData() {
        return JSON.parse(Entry.variableContainer.getVariableByName('EntAI-학습') ? false : Entry.variableContainer.getVariableByName('EntAI-학습').getValue());
    }
    function getBlock(template) {
        var check = _.find(Entry.variableContainer.functions_,
            d => d.block.template.replace(/ /gi,'') == template.replace(/ /gi,''));
        if (!check) return false;
        return check.id;
    }
    function throwError(title,content) {
        Entry.toast.alert(title,content);
        Entry.engine.toggleStop();
        return false;
    }
    const Block = {
        detectImage: '%1AI로%2의이미지감지하기%3',
        getAIResult: 'AI결과의%1데이터가져오기%2',
        getAIResultOther: 'AI의%1클래스의결과%2데이터가져오기%3'
    };
    if(!checkFunction(Block.detectImage)) return throwError('모델학습 오류','"(문자/숫자값) AI로 (문자/숫자값)의 이미지 감지하기" 함수가 필요합니다.');
    Entry.block[`func_${getBlock(Block.detectImage)}`].paramsKeyMap = { PRESET: 0, OBJECT: 1 };
    Entry.block[`func_${getBlock(Block.detectImage)}`].func = async (sprite,script) => {
        script.Param = name => {return script.getValue(name,script).toString()};
        const objectName = script.Param('OBJECT');
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
        if(typeof knnMobilenet == 'undefined' || typeof tf == 'undefined' || typeof knn == 'undefined') {
            Entry.toast.alert('EntAI 오류','필요한 라이브러리를 찾을수 없습니다');
            Entry.engine.toggleStop();
            return;
        }
        const presetName = script.Param('PRESET');
        if(Object.keys(modelData()).indexOf(presetName) == -1) return throwError('모델학습 오류',`"${presetName}" 이름에 해당하는 AI를 찾을수 없습니다.`);
        var airesult;
        if(sprite.picture.fileurl) {
            try {
                airesult = await knnHandleAI(presetName,sprite.picture.fileurl);
            } catch (e) {
                return throwError('모델학습 오류','뭔가가 잘못되었습니다. 디스코드 muno9748#2626로 dm 보내주세요');
            }
        } else {
            try {
                airesult = await knnHandleAI(presetName,`/uploads/${sprite.picture.filename.substr(0,2)}/${sprite.picture.filename.substr(2,2)}/thumb/${sprite.picture.filename}.png`);
            } catch (e) {
                return throwError('모델학습 오류','뭔가가 잘못되었습니다. 디스코드 muno9748#2626로 dm 보내주세요');
            }
        }
        window.detectImageBlockResult = airesult;
        if(_.find(Entry.variableContainer.messages_, d => d.name.replace(/ /gi,'') == '모델학습완료')) Entry.engine.raiseMessage(_.find(Entry.variableContainer.messages_, d => d.name == '감지완료').id);
        return;
    };
    if(!checkFunction(Block.getAIResult)) return throwError('모델학습 오류','"AI결과의 (문자/숫자값)의 테이터 가져오기" 함수가 필요합니다.');
    Entry.block[`func_${getBlock(Block.getAIResult)}`].paramsKeyMap = { DATANAME: 0 };
    Entry.block[`func_${getBlock(Block.getAIResult)}`].func = (sprite,script) => {
        script.Param = name => {return script.getValue(name,script).toString()};
        if(!Entry.variableContainer.getVariableByName('모델학습-결과')) return throwError('모델학습 오류','"모델학습-결과" 변수가 필요합니다.');
        switch(script.Param('DATANAME').replace(/ /gi,'')) {
            case '라벨':
                if(!window.detectImageBlockResult) return throwError('모델학습 오류', '먼저 이미지를 감지해주세요');
                Entry.variableContainer.getVariableByName('모델학습-결과').setValue(window.detectImageBlockResult.result.label);
                return;
            case '정확도':
                if(!window.detectImageBlockResult) return throwError('모델학습 오류', '먼저 이미지를 감지해주세요');
                Entry.variableContainer.getVariableByName('모델학습-결과').setValue(parseInt(window.detectImageBlockResult.result.confidences.result.toString()) * 100);
                return;
            default:
                return throwError('모델학습 오류','"라벨" 또는 "정확도" 데이터만 가져올수 있습니다');
        }
    }
    if(checkFunction(Block.getAIResultOther)) {
        Entry.block[`func_${getBlock(Block.getAIResultOther)}`].paramsKeyMap = { CLASSNAME: 0, DATANAME: 1 };
        Entry.block[`func_${getBlock(Block.getAIResultOther)}`].func = (sprite,script) => {
            script.Param = name => {return script.getValue(name,script).toString()};
            if(!window.detectImageBlockResult) return throwError('모델학습 오류', '먼저 이미지를 감지해주세요');
            if(!Entry.variableContainer.getVariableByName('모델학습-결과')) return throwError('모델학습 오류','"모델학습-결과" 변수가 필요합니다.');
            if(Object.keys(window.detectImageBlockResult.confidences).indexOf(script.Param('CLASSNAME')) == -1) return throwError('모델학습 오류','클래스를 찾을수 없습니다.');
            switch(script.Param('DATANAME').replace(/ /gi,'')) {
                case '라벨':
                    if(!window.detectImageBlockResult) return throwError('모델학습 오류', '먼저 이미지를 감지해주세요');
                    Entry.variableContainer.getVariableByName('모델학습-결과').setValue(script.Param('CLASSNAME'));
                    return;
                case '정확도':
                    if(!window.detectImageBlockResult) return throwError('모델학습 오류', '먼저 이미지를 감지해주세요');
                    Entry.variableContainer.getVariableByName('모델학습-결과').setValue(parseInt(window.detectImageBlockResult[script.Param('CLASSNAME')].result.toString()) * 100);
                    return;
                default:
                    return throwError('모델학습 오류','"라벨" 또는 "정확도" 데이터만 가져올수 있습니다');
            }
        }
    }
}

/**
 * EntAI 3.0 By muno9748
 * EntAI 3.0 UI Creator
 * Copyright 2020. EntAI All Rights Reserved.
**/

$('.btn_workspace_ai_parent').remove();
$($('header.common_gnb .group_box .group_inner')[0]).prepend('<div class="work_space btn_workspace_ai_parent"><a title="모델학습" class="btn_work_space btn_workspace_ai"></a></div>');
$('.ai_popup_open_btn_stylesheet').remove();
$(document.head).append(`<style class="ai_popup_open_btn_stylesheet">
<style>
.btn_workspace_ai:after {
    background: none !important;
}
.btn_workspace_ai {
    background-size: 25px !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZpZXdCb3g9IjAgMCAxNzIgMTcyIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2UtZGFzaGFycmF5PSIiIHN0cm9rZS1kYXNob2Zmc2V0PSIwIiBmb250LWZhbWlseT0ibm9uZSIgZm9udC13ZWlnaHQ9Im5vbmUiIGZvbnQtc2l6ZT0ibm9uZSIgdGV4dC1hbmNob3I9Im5vbmUiIHN0eWxlPSJtaXgtYmxlbmQtbW9kZTogbm9ybWFsIj48cGF0aCBkPSJNMCwxNzJ2LTE3MmgxNzJ2MTcyeiIgZmlsbD0ibm9uZSI+PC9wYXRoPjxnIGZpbGw9IiNmZmZmZmYiPjxwYXRoIGQ9Ik03OS4xMiwwYy0yNC44NTkzNywwIC00My4xODgxMiw4LjU4NjU2IC01NS4wNCwyMi4wMzc1Yy0xMS44NTE4NywxMy40NTA5NCAtMTcuMiwzMS40ODQwNiAtMTcuMiw1MC4yMDI1YzAsMTUuMTU3NSA0LjczLDI5LjI5Mzc1IDEyLjY4NSw0MC44NWM3LjIwMjUsMTAuNDgxMjUgMTEuMzk1LDIyLjgxNjg4IDExLjM5NSwzNS40NzV2MjMuNDM1aDYuODh2LTIzLjQzNWMwLC0xNC4wNTU2MiAtNC42NzYyNSwtMjcuNjY3ODEgLTEyLjQ3LC0zOS4xM2wtMC4yMTUsLTAuMzIyNWMtNy4xODkwNiwtMTAuNDU0MzcgLTExLjM5NSwtMjMuMTM5MzcgLTExLjM5NSwtMzYuODcyNWMwLC0xNy40MDE1NiA0Ljk3MTg4LC0zMy43Njg0NCAxNS40OCwtNDUuNjg3NWMxMC41MDgxMywtMTEuOTE5MDYgMjYuNTc5MzgsLTE5LjY3MjUgNDkuODgsLTE5LjY3MjVjMjMuMzk0NjksMCAzOC41NzkwNiw2Ljc4NTk0IDQ4LjU5LDE3LjJjMTAuMDEwOTQsMTAuNDE0MDYgMTQuOTI5MDYsMjQuNzkyMTkgMTYuNzcsNDAuMzEyNWwwLjEwNzUsMC43NTI1bDAuMzIyNSwwLjUzNzVsMTYuMjMyNSwyNy44NDI1aC0wLjEwNzVjMC44NiwxLjU0NTMxIDAuNDMsMy4wMzY4OCAtMS4wNzUsMy44N3YwLjEwNzVsLTE1LjQ4LDcuNzR2MjAuNjRjMCwxMi44NzMxMyAtMTAuNjE1NjIsMjIuOTEwOTQgLTIzLjQzNSwyMS43MTVoLTAuMTA3NWwtMTAuNjQyNSwtMC43NTI1bC0zLjY1NSwtMC4yMTV2MjUuMzdoNi44OHYtMTguMDZsNi44OCwwLjUzNzVjMC4wNDAzMSwwIDAuMDY3MTksMCAwLjEwNzUsMGMxNi43MTYyNSwxLjQ5MTU2IDMwLjg1MjUsLTExLjkxOTA2IDMwLjg1MjUsLTI4LjU5NXYtMTYuNDQ3NWwxMS44MjUsLTUuOTEyNWgwLjEwNzVsMC4xMDc1LC0wLjEwNzVjNC42ODk2OSwtMi42MDY4NyA2LjIzNSwtOC41NzMxMiAzLjY1NSwtMTMuMjIyNXYtMC4xMDc1bC0xNS45MSwtMjcuNTJjLTIuMDQyNSwtMTYuMTExNTYgLTcuMzIzNDQsLTMxLjU5MTU2IC0xOC40OSwtNDMuMjE1Yy0xMS40MDg0NCwtMTEuODY1MzEgLTI4Ljc2OTY5LC0xOS4zNSAtNTMuNTM1LC0xOS4zNXpNNjcuNjE3NSwyMC42NGwtMC41Mzc1LDIuOTAyNWwtMS43MiwxMC4yMTI1Yy0xLjU5OTA2LDAuNDgzNzUgLTMuMTQ0MzcsMS4xNTU2MyAtNC42MjI1LDEuOTM1bC04LjQ5MjUsLTYuMTI3NWwtMi4zNjUsLTEuNzJsLTIuMDQyNSwyLjA0MjVsLTcuMzEsNy4yMDI1bC0yLjA0MjUsMi4xNWwxLjcyLDIuMzY1bDYuMTI3NSw4LjQ5MjVjLTAuNzI1NjIsMS4zOTc1IC0xLjM3MDYyLDIuOTQyODEgLTEuOTM1LDQuNjIyNWwtMTAuNjQyNSwyLjE1bC0yLjc5NSwwLjUzNzV2MTYuMDE3NWwyLjkwMjUsMC41Mzc1bDEwLjIxMjUsMS43MmMwLjU2NDM4LDEuNjc5NjkgMS4yMDkzOCwzLjIyNSAxLjkzNSw0LjYyMjVsLTYuMTI3NSw4LjQ5MjVsLTEuNzIsMi4zNjVsMi4wNDI1LDIuMDQyNWw3LjIwMjUsNy4zMWwyLjE1LDIuMDQyNWwyLjM2NSwtMS43Mmw4LjQ5MjUsLTYuMTI3NWMxLjM5NzUsMC43MjU2MyAyLjk0MjgxLDEuMzcwNjMgNC42MjI1LDEuOTM1bDEuNzIsMTAuMjEyNWwwLjUzNzUsMi45MDI1aDE2LjEyNWwwLjQzLC0yLjkwMjVsMS44Mjc1LC0xMC41MzVjMS42MTI1LC0wLjU3NzgxIDMuMTU3ODEsLTEuMjA5MzcgNC42MjI1LC0xLjkzNWw4LjgxNSw2LjEyNzVsMi4zNjUsMS42MTI1bDIuMDQyNSwtMi4wNDI1bDcuMzEsLTcuMjAyNWwyLjA0MjUsLTIuMDQyNWwtMS43MiwtMi4zNjVsLTYuMTI3NSwtOC40OTI1YzAuNzEyMTksLTEuMzcwNjIgMS4zNzA2MywtMi44NzU2MiAxLjkzNSwtNC41MTVsMTAuNDI3NSwtMS41MDVsMy4wMSwtMC40M3YtMTYuMjMyNWwtMi45MDI1LC0wLjUzNzVsLTEwLjUzNSwtMS43MmMtMC40OTcxOSwtMS41NTg3NSAtMS4xMjg3NSwtMy4xNDQzNyAtMS45MzUsLTQuNzNsNi4xMjc1LC04LjgxNWwxLjcyLC0yLjM2NWwtMi4wNDI1LC0yLjA0MjVsLTcuMzEsLTcuMjAyNWwtMi4wNDI1LC0yLjA0MjVsLTIuMzY1LDEuNzJsLTguNDkyNSw2LjEyNzVjLTEuMzk3NSwtMC43MjU2MiAtMi45NDI4MSwtMS4zNzA2MiAtNC42MjI1LC0xLjkzNWwtMS43MiwtMTAuMjEyNWwtMC41Mzc1LC0yLjkwMjV6TTczLjQyMjUsMjcuNTJoNC41MTVsMS42MTI1LDkuMTM3NWwwLjMyMjUsMi4zNjVsMi4yNTc1LDAuNDNjMi41NjY1NiwwLjU2NDM4IDUuMDI1NjMsMS44MTQwNiA3LjMxLDMuMTE3NWwxLjkzNSwxLjA3NWwxLjgyNzUsLTEuMjlsNy42MzI1LC01LjQ4MjVsMy4wMSwzLjExNzVsLTUuNDgyNSw3Ljk1NWwtMS4zOTc1LDEuODI3NWwxLjI5LDEuOTM1YzEuNTA1LDIuNDA1MzEgMi4zOTE4OCw0LjgyNDA2IDMuMDEsNy4zMWwwLjUzNzUsMi4xNWwyLjI1NzUsMC4zMjI1bDkuNDYsMS42MTI1djQuNDA3NWwtMTEuODI1LDEuNjEyNWwtMC40MywyLjM2NWMtMC41NjQzNywyLjU2NjU2IC0xLjgxNDA2LDUuMDI1NjMgLTMuMTE3NSw3LjMxbC0xLjA3NSwxLjkzNWwxLjI5LDEuODI3NWw1LjQ4MjUsNy41MjVsLTMuMTE3NSwzLjExNzVsLTcuOTU1LC01LjU5bC0xLjYxMjUsLTEuMTgyNWwtMS45MzUsMC45Njc1Yy0yLjc1NDY5LDEuMzcwNjMgLTUuMjk0MzcsMi42NzQwNiAtNy41MjUsMy4yMjVsLTIuMTUsMC41Mzc1bC0wLjQzLDIuMTVsLTEuNjEyNSw5LjU2NzVoLTQuNDA3NWwtMS42MTI1LC05LjI0NWwtMC4zMjI1LC0yLjI1NzVsLTIuMjU3NSwtMC40M2MtMi41NjY1NiwtMC41NjQzNyAtNS4wMjU2MiwtMS44MTQwNiAtNy4zMSwtMy4xMTc1bC0xLjkzNSwtMS4wNzVsLTEuODI3NSwxLjI5bC03LjUyNSw1LjQ4MjVsLTMuMTE3NSwtMy4wMWw1LjQ4MjUsLTcuNjMyNWwxLjI5LC0xLjgyNzVsLTEuMDc1LC0xLjkzNWMtMS4zMDM0NCwtMi4yODQzNyAtMi41NTMxMiwtNC43NDM0NCAtMy4xMTc1LC03LjMxbC0wLjQzLC0yLjI1NzVsLTIuMzY1LC0wLjMyMjVsLTkuMTM3NSwtMS42MTI1di00LjYyMjVsOS41Njc1LC0xLjgyNzVsMi4yNTc1LC0wLjQzbDAuNDMsLTIuMTVjMC41NjQzOCwtMi41NjY1NiAxLjgxNDA2LC01LjAyNTYyIDMuMTE3NSwtNy4zMWwxLjA3NSwtMS45MzVsLTEuMjksLTEuODI3NWwtNS40ODI1LC03LjUyNWwzLjAxLC0zLjExNzVsNy42MzI1LDUuNDgyNWwyLjA0MjUsMS4zOTc1bDIuMDQyNSwtMS4zOTc1YzEuOTM1LC0xLjM4NDA2IDQuMTc5MDYsLTIuMjg0MzcgNi45ODc1LC0yLjkwMjVsMi4yNTc1LC0wLjQzbDAuMzIyNSwtMi4zNjV6TTc1LjY4LDQ4LjE2Yy05LjQ0NjU2LDAgLTE3LjIsNy43NTM0NCAtMTcuMiwxNy4yYzAsOS40NDY1NiA3Ljc1MzQ0LDE3LjIgMTcuMiwxNy4yYzkuNDQ2NTYsMCAxNy4yLC03Ljc1MzQ0IDE3LjIsLTE3LjJjMCwtOS40NDY1NiAtNy43NTM0NCwtMTcuMiAtMTcuMiwtMTcuMnpNNzUuNjgsNTUuMDRjNS42OTc1LDAgMTAuMzIsNC42MjI1IDEwLjMyLDEwLjMyYzAsNS42OTc1IC00LjYyMjUsMTAuMzIgLTEwLjMyLDEwLjMyYy01LjY5NzUsMCAtMTAuMzIsLTQuNjIyNSAtMTAuMzIsLTEwLjMyYzAsLTUuNjk3NSA0LjYyMjUsLTEwLjMyIDEwLjMyLC0xMC4zMnoiPjwvcGF0aD48L2c+PC9nPjwvc3ZnPg==")
}
</style>`);
$('.btn_workspace_ai').click(() => {
    showKnnModal();
});
var resultContainer = `
<div data-reactroot="" class="ModalView-cssmodule-modalView-25KwR ENABLED knnResultRootContainer">
<div class="knn_result_container" style="
    width: 70%;
    height: 70%;
    background: white;
    border-radius: 30px;
    z-index: 10000;
    position: relative;
    visibility: visible !important;
"><div class="knn_result_header" style="
    width: 100%;
    height: 50px;
    background: cornflowerblue;
    border-radius: 30px 30px 0px 0px;
"><span style="
    color: white;
    position: relative;
    font-size: 1.2rem;
    top: 10px;
    padding-left: 20px;
">분석 결과</span>
<div class="button entryLmsClose knnResultContainerClose" style="position: relative;width: 30px;height: 30px;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAAXNSR0IArs4c6QAAAclJREFUOBGllNkrRGEYxidlz75nSYlsuZQr9y4kkSQlyZIsSYmUlJL8OUKS5EKRiJQQcWGPv8B2/B7Nx8yZc8bBUz/f+73v8z4z6ZzxWZa1BJuQ4funyBiFG6j28Ueh0iGk/zWb3TGFoDeoUXAmHIF0AGm/DWdH31RSaMfXPpcsOAZpH1K/hj8UeEe0hN6hM8ROMxtOQNqDlBCTrYFnSGak0C7b+PvKMAdOQdqF5O9pcMVsQCak0J7gqcMNUy6cgbQDSXYbvX4NkUL77HPXO+Y8OAdpGxKNmboXFCj1m77nk6V8uNA22oIE6AYTOug5zG4kpAAuQdK/x4QO272/vhNWCI9gNO4lJMKDqRZP4HNdxyfEe9hztxDQDnqbpDm4+qwsa4Mzzn0zzITFNnj1B03ISl0E1/7eOmdsmIjQEQutYEInAx30i0G/YNIaeAvH2AImdCow1NTMS+AWpFWIMTPHE0MTvIA07WjyN5mXwp2MaAWiHf0MGsGEzjiabE38ZXAP0jIEh9NogGeQZm37Ya/4K+BBi2gRoj4XKOrBhM6FTXEZsl8J5iVaoI7UI2SezXmXPU9tcqrgCaRmBXdAr6ftH0zklINepPQPSdVxZJrHhNwAAAAASUVORK5CYII=);background-repeat: no-repeat;float:right;top: 15px;padding-right:40px;"></div></div><div class="knnResultContainerContents" style="
    width: 100%;
    height: calc(100% - 50px);
    border-radius: 0px 0px 30px 30px;
    overflow-y: hidden;
    overflow-x: hidden;
    word-break: keep-all;
    padding: 20px;
"><div style="
    flex-direction: column;
    display: flex;
    position: absolute;
    left: 25%;
    width: 100vh;
    height: calc(100% - 90px);
    padding: 20px;
    background: whitesmoke;
    border-radius: 30px;
    box-sizing: border-box;
    box-shadow: 0px 0px 50px 0px #d6d6d6;
    overflow-x: hidden;
    overflow-y: auto;
    align-items: flex-start;
" class="knnResultDetailList">



</div><div style="
    position: relative;
    background: whitesmoke;
    width: 30%;
    height: calc(100% + 60px);
    top: -40px;
    left: -120px;
    box-sizing: border-box;
    box-shadow: -20px 0px 100px 10px #d6d6d6;
    padding: 20px;
    padding-left: 10%;
    padding-top: 30px;
    margin-right: 0px !important;
"><h1 style="
    color: black;
    border-bottom: 1px grey solid;
    padding-bottom: 10px;
">요약</h1><div style="
    color: black;
">예측된 결과: <span style="color:black" class="knnResultResult"></span></div><div style="
    color: black;
">정확도: <span style="color:black" class="knnResultResultProbability"></span></div>
<div style="
    color: black;
    border-radius: 10px;
    box-shadow: 0px 0px 20px 0px #d6d6d6;
    padding: 10px;
    height: 450px;
    overflow: scroll;
    margin-top: 10px;
">다른 클래스들의 정확도: <div class="list-group knnResultMinifiedList">



</div></div>


</div></div></div>
</div>
`;
var flowChart = `<section class="container" style="
    width: 500px;
    padding: 0px;
    margin: 0px;
    position: absolute;
    height: 760px;
    margin-top: 10px;
    margin-left: auto;
    margin-right: auto;
    display: table;
">

  <!-- in the sources container show three cards, side by side, or one atop the other on smaller viewports -->
<div class="container__sources" style="
    padding: 10px 1.5rem 10px 1.5rem;
">

    

    

    <div class="sources--data" style="padding: 10px 1.5rem 10px 1.5rem;">
      <h3>이미지 입력</h3>
      <p>이미지를 입력으로 받고 AI가 분석해 결과를 알려줍니다</p>
    </div>

<div style="
    display: flex;
    flex-wrap: wrap;
    width: 410px;
">
    <input type="file" class="entryRemove knnFlowChartImageInput" accept=".png,.jpg,.jpeg" />
<img src="https://lh3.googleusercontent.com/mLUH9KuxjRrjj4SIv07wky5mRwBZgvdnIeGR-xq47WlkHrcs9iVjOXvHUIATwnh1YvBtGfSJC7B6ABifbpFm4NsnlSXveNkZ-lnjNr7RqLhsrkZUQLH-q4CFeFRGCC5ui8QBDzmK7RVihy8hG3igZWIajtcCgqGPGrulO1HbMeYPc3ZXbFbQw3mEGv0MPvHwde6B6hlRbqcb4ikSAb6qSxVA6Br6OvXFv7NpLHOhX7wHceUS9QdCDpmgKUJ_n8tW7TlGJvY-Ds5S76SrSiN3pS-gTyaifAny9E_OYkLW5KOZhd7WET99AKx6PBz6nVzXSzv6qIgu2mutLTFnEUM99H6vPwuajHEpMeI9sUybLMhGaZBVjXiAX7v_mRKodw5HN7qGu8NEZl1U8PaHJEQayWxotOpBbJ288Gh89H0wel8CXF5DDhkT4-pu3OyocmweBK9v3lS-aO56H73DUTCzglVxcZUz_ArjivrWLyAMcl6kCQDOu1MnGpYlJ6N9VIFUUOM4iFZpRFctzjz4S1bCNdSXD_Eyx6IY50Wo09Zh3gV2I-TnJ8Gelu1uwayyx0mDOVLq6D-MLbPm5wox1vZ8EShgKbdnCYU2x4jtN9vJAPSczeF4u4CfDlq2QpLIXOV1WW-yTT0FtmpYuds6_CEZzF1ELUi80VAaBFrtY6IZq2hci6uQJWA_wiLfaVU=w328-h327-no" style="width: 100px !important; height: 100px !important; position: absolute;top: 23px;" class="knnFlowChartUploadImage knnFlowChartUploadedImageView"><button type="button" class="btn btn-outline-info knnFlowChartUploadImage" style="
    position: relative;
    left: 120px;
    height: 70px;
    width: 50px;
    word-break: keep-all;
    margin: 0px 5px 0px 5px;
">사진 업로드</button>
<button type="button" class="btn btn-outline-success knnFlowChartDetectImage" style="
    position: relative;
    left: 120px;
    height: 70px;
    width: 50px;
    word-break: keep-all;
    margin: 0px 5px 0px 5px;
">이미지 감지</button><button type="button" class="btn btn-outline-danger knnFlowChartRemoveAI" style="
    position: relative;
    left: 120px;
    height: 70px;
    width: 50px;
    word-break: keep-all;
    margin: 0px 5px 0px 5px;
">AI 삭제</button>
<span align="center" style="color: grey; position: relative; top: 10px; display: block; width: 100%;">(jpg, png 파일만 업로드 가능)</span>
</div>

  </div>

  <!-- include a simple line to divide the container, and animate it to show a connection between the different containers  -->
  <svg viewBox="0 0 10 100">
    <line x1="5" x2="5" y1="0" y2="100"></line>
  </svg>


  <!-- in the build container show two cards, atop of one another and the first of one showing an SVG icon -->
  <div class="container__build" style="
    display: flex;
    padding: 0px 70px 0px 70px;
    height: 300px;
    flex-direction: row;
    align-items: center;
    width: 1000px;
">

    <div class="build--powered" style="
    padding: 0px;
    height: 120px;
    display: block !important;
    position: absolute;
    width: 300px;
    top: -70px;
    left: 50%;
    margin-left: -150px;
">
      <svg viewBox="0 0 100 100">
          <defs>
            <pattern id="tfLogo" patternUnits="userSpaceOnUse" height="100" width="100">
              <image x="0" y="0" height="100" width="100" xlink:href="https://3.bp.blogspot.com/-d-nV7xJRmpw/Xo328dcAx3I/AAAAAAAAC7Q/qlqJOle6XIosJ3CGIDJ04F3Voh1iXDg0gCLcBGAsYHQ/s1600/TF_FullColor_Icon.jpg"></image>
            </pattern>
          </defs>
        <circle cx="50" cy="50" r="50" fill="url(#tfLogo)">
        </circle>
      </svg>
      <p style="
    margin: 0px;
    color: #5f39dd;
">powered by</p>
      <a href="https://www.tensorflow.org/js/" target="_blank"><h3 style="color: black; font-size: 1.2rem;">Tensorflow</h3></a>
    </div>
    <div class="build--stack knn_stack_addContainer"><button class="knn_stack_addButton btn btn-primary" style="
    width: 100px;
    height: 130px;
    padding: 0px;
    background: #5f39dd;
    border-color: #5f39dd;
"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.7499 4.5C12.1641 4.5 12.4999 4.83579 12.4999 5.25V11H18.25C18.6642 11 19 11.3358 19 11.75C19 12.1642 18.6642 12.5 18.25 12.5H12.4999V18.25C12.4999 18.6642 12.1641 19 11.7499 19C11.3357 19 10.9999 18.6642 10.9999 18.25V12.5H5.25C4.83579 12.5 4.5 12.1642 4.5 11.75C4.5 11.3358 4.83579 11 5.25 11H10.9999V5.25C10.9999 4.83579 11.3357 4.5 11.7499 4.5Z" style="
    fill: white;
"></path></svg></button></div></div>

  <!-- repeat the svg line to connect the second and third containers as well -->
  <svg viewBox="0 0 10 100">
    <line x1="5" x2="5" y1="0" y2="100"></line>
  </svg>

  <!-- in the deploy container show simply text, without a wrapping card -->
  <div class="container__deploy" style="padding: 10px 1.5rem 10px 1.5rem;">
<div class="sources--data" style="
    text-align: left;
    margin: 0 1rem;
    line-height: 2;
    background: #fff;
    padding: 1.2rem 1rem;
    border-radius: 4px;
    box-shadow: 0 2px 10px #e6e6e6;
    width: 560px;
">
    <h3>텍스트 출력</h3>
    <p>자신이 AI를 잘 학습시켰다면 AI가 이미지를 인식하여 텍스트를 출력 할 것입니다!</p>
</div>
<div style="
    left: calc(560px + (1.2rem * 2));
    margin: 0 1rem;
    text-align: left;
    line-height: 2;
    background: #fff;
    padding: 1.2rem 1rem;
    position: absolute;
    border-radius: 4px;
    width: 340px;
    height: 115px;
    top: 10px;
    box-shadow: 0px 2px 10px #e6e6e6;
"><button class="btn btn-outline-success knnResultShow disabled" style="
    width: 90%;
    height: 90%;
">결과보기</button></div>
  </div>

</section>`;
$(".bootstrapStylesheet").remove();
var presetData = {};
$(document.head).append(`<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" rel="stylesheet" class="bootstrapStylesheet"></link>`);
function showKnnModal() {
    if (!(Entry.variableContainer.getVariableByName('EntAI-학습'))) Entry.variableContainer.setVariables([{name:'EntAI-학습',value:'{}',visible:false}]);
    presetData = JSON.parse(Entry.variableContainer.getVariableByName('EntAI-학습').getValue());
$($('.entrylmsModalCommon div')[1]).append(`
<div class="ModalView-cssmodule-modalView-25KwR ENABLED knnRootContainer">
    <div class="knn_container" style="
    width: 90%;
    height: 90%;
    background: white;
    border-radius: 30px;
"><div class="knn_header" style="
    background: cornflowerblue;
    width: 100%;
    height: 50px;
    border-radius: 30px 30px 0px 0px;
    color: white;
    font-size: 20px;
    padding-left: 20px;
"><span style="
    display: table-cell;
    vertical-align: middle;
    width: 100%;
    height: 50px;
">모델 학습</span><div class="button entryLmsClose knnContainerClose" style="position: relative;width: 30px;height: 30px;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAAXNSR0IArs4c6QAAAclJREFUOBGllNkrRGEYxidlz75nSYlsuZQr9y4kkSQlyZIsSYmUlJL8OUKS5EKRiJQQcWGPv8B2/B7Nx8yZc8bBUz/f+73v8z4z6ZzxWZa1BJuQ4funyBiFG6j28Ueh0iGk/zWb3TGFoDeoUXAmHIF0AGm/DWdH31RSaMfXPpcsOAZpH1K/hj8UeEe0hN6hM8ROMxtOQNqDlBCTrYFnSGak0C7b+PvKMAdOQdqF5O9pcMVsQCak0J7gqcMNUy6cgbQDSXYbvX4NkUL77HPXO+Y8OAdpGxKNmboXFCj1m77nk6V8uNA22oIE6AYTOug5zG4kpAAuQdK/x4QO272/vhNWCI9gNO4lJMKDqRZP4HNdxyfEe9hztxDQDnqbpDm4+qwsa4Mzzn0zzITFNnj1B03ISl0E1/7eOmdsmIjQEQutYEInAx30i0G/YNIaeAvH2AImdCow1NTMS+AWpFWIMTPHE0MTvIA07WjyN5mXwp2MaAWiHf0MGsGEzjiabE38ZXAP0jIEh9NogGeQZm37Ya/4K+BBi2gRoj4XKOrBhM6FTXEZsl8J5iVaoI7UI2SezXmXPU9tcqrgCaRmBXdAr6ftH0zklINepPQPSdVxZJrHhNwAAAAASUVORK5CYII=);background-repeat: no-repeat; float:right;top: -37px;padding-right:40px;"></div>
</div><div class="knnContents" style="
    width: 100%;
    height: 95%;
    border-radius: 0px 0px 30px 30px;
">
<div class="knnPresets row" style="
    width: 100%;
    margin: 0px;
    position: absolute;
">
<div class="col-2" style="    padding: 0px;
    height: 80vh;
    margin-right: 100px;
    box-shadow: 100px 0px 100px -100px #e6e6e6;
    box-sizing: content-box;
    padding-right: 70px;
    padding-bottom: 30px;
    padding-left: 10px;
    padding-top: 10px;
    border-bottom-left-radius: 30px;"><div class="list-group knnPresetList">
<div class="list-group-item list-group-item-action" style="
    padding: 0px !important;
    width: 100%;
">
  
<button class="btn btn-primary knnAddPreset" type="submit" style="
    width: 10px;
    float: right;
    position: absolute;
    height: 70%;
    left: 102%;
">+</button><div class="input-group">
  <input type="text" class="form-control knnAddPresetName" placeholder="AI 이름" aria-label="Username" aria-describedby="basic-addon1" style="
    margin: 0px !important;
">
</div>
</div>
</div>

</div>

<div class="col-9 knnModelArea" style="
    position: fixed;
    left: 30%;
">
<img src="https://lh3.googleusercontent.com/v7Kj9i1VJhtqj_70O2TIRZrXPocYxqdDpyhVR5Qe5D19YmCxXQNGHLaLYYUYh-WmsEU3UtkAKV1Ux17qxHrv7-Ko1iQ-nZ_0U7js8azyhpmEug-fxkBh1_zGYJV2rPjewCNZg3pcfvS8_VWcOH-y1GElbLELxwAsrbA9VkrBAGFJXe0mVaxgiLHffcsCh3mVUjujzP0N8fNW_L6V-k915U95d9QIxtYFfwxHQNRJNd7bLSUHx2631iQzdecERPjc-QodQbqeeNpCzg1nPXlfAxV0AnAXc1FObT_PpBotWHsU5wDiOCjjQRBo2QfVZzdvMj6nBFVVhBPc7zbrxQRXMG6lhaPdTQkBL7WzqIoZ6lw5845bVTwsSWtqFQFexbMbco9rxJChm58pPdvxxAgE4cSDcgiW4jMhpf4JWAKzUzJvjJ4giKnFfGQxTlGEVE0JC1aQhmubUtsmmqYit7Dn7hfK1e1KSdOFsZiJJZG-IqsBPD7hWdcpU-ZCP10kOV2woOMPgRG18_GOgYS2R17pSD3wwReQadjCaB-utJ3StjErZvGZ-DuwrqGReX5tgG86IyaJyV7M9wPMYPWfFwJsTLHms0ZomQGSqKZnfAwuTjYrL8GX2qU2T6FYjfR-1K8tIkIdMlrW94EB2OURgpVp_KLtf6Q8emwimPNIniy-VzaAXMGPW3DsfhRV7yc=w368-h220-no" style="
    position: relative;
    top: 150px;
    left: 50%;
    width: 368px;
    margin-left: -368px;
">
<div class="input-group mb-3" style="
    width: 600px;
    position: relative;
    left: 40%;
    transform: translateX(-50%);
    top: 200px;
">
  <input type="text" class="form-control knnHomeAddPresetName" placeholder="AI 이름" aria-label="AI 이름" aria-describedby="button-addon2">
  <div class="input-group-append" style="
">
    <button class="btn btn-outline-success knnHomeAddPreset" type="button" id="button-addon2">만들기</button>
  </div>
</div>
</div></div>
</div></div>
</div>`);
var usingPresetIds = [];
var currentPreset;
$('.knnContainerClose').click(() => {
    if (!(Entry.variableContainer.getVariableByName('EntAI-학습'))) Entry.variableContainer.setVariables([{name:'EntAI-학습',value:'{}',visible:false}]);
    Entry.variableContainer.getVariableByName('EntAI-학습').setValue(JSON.stringify(presetData));
    $('.knnRootContainer').remove();
});
$('.knnAddPreset').click(() => {
    if($('.knnAddPresetName').val().trim() == '') {
        alert('올바른 이름을 입력해주세요!');
        $('.knnAddPresetName').val('');
        return;
    }
    if(Object.keys(presetData).indexOf($('.knnAddPresetName').val().trim()) != -1) {
        alert('이 이름은 이미 사용중입니다!');
        $('.knnAddPresetName').val('');
        return;
    }
    currentPreset = $('.knnAddPresetName').val().trim();
    presetData[currentPreset] = {
        classes: ['클래스 1','클래스 2'],
        datas: {
            '클래스 1': {
                name: '클래스 1',
                images: []
            },
            '클래스 2': {
                name: '클래스 2',
                images: []
            }
        },
        classId: {
            '클래스 1': 1,
            '클래스 2': 2
        },
        usingIds: [1,2],
        id: usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1
    };
    usingPresetIds.push(usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1);
    $('.knnAddPresetName').val('');
    updateList();
    $($('button.knnPresets')[$('button.knnPresets').length - 1]).click();
});
$('.knnHomeAddPreset').click(() => {
    if($('.knnHomeAddPresetName').val().trim() == '') {
        alert('올바른 이름을 입력해주세요!');
        $('.knnHomeAddPresetName').val('');
        return;
    }
    if(Object.keys(presetData).indexOf($('.knnHomeAddPresetName').val().trim()) != -1) {
        alert('이 이름은 이미 사용중입니다!');
        $('.knnHomeAddPresetName').val('');
        return;
    }
    currentPreset = $('.knnHomeAddPresetName').val().trim();
    presetData[currentPreset] = {
        classes: ['클래스 1','클래스 2'],
        datas: {
            '클래스 1': {
                name: '클래스 1',
                images: []
            },
            '클래스 2': {
                name: '클래스 2',
                images: []
            }
        },
        classId: {
            '클래스 1': 1,
            '클래스 2': 2
        },
        usingIds: [1,2],
        id: usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1,
        isMaxClasses: false
    };
    usingPresetIds.push(usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1);
    $('.knnAddPresetName').val('');
    updateList();
    $($('button.knnPresets')[$('button.knnPresets').length - 1]).click();
});
updateList();
function updateList() {
    $('button.knnPresets').remove();
    Object.keys(presetData).forEach(el => $('.knnPresetList').append(`<button type="button" class="list-group-item list-group-item-action knnPreset_${presetData[el].id} knnPresets" style="width: 100%;">${el}</button>`));
    $('button.knnPresets').each((i, el) => {
        el = $(el);
        el.click(e => {
            knnUIHandlePresetButton(e);
        });
    });
}
function knnUIHandlePresetButton(e) {
    $('button.knnPresets').each((i,el) => {
        if($(el).attr('class').slice(-15) == 'disabled active') $(el).attr('class',$(el).attr('class').slice(0,-16));
    });
    $(e.target).attr('class', $(e.target).attr('class') + ' disabled active');
    $('.knnModelArea')[0].innerHTML = flowChart;
    currentPreset = e.target.innerText;
    presetData[currentPreset].classes.forEach(el => {$('.container__build').append(`
    <div class="build--stack knn_stack_contanier">
    <button type="button" class="btn btn-primary knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}" style="
        position: absolute;
        top: 85px;
        left: 10px;
        background-color: #5f39dd;
        border-color: #5f39dd;
    "><svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" style="width: 15px;margin: 5px;position: relative;left: -5px;"><path fill-rule="evenodd" d="M 0 12 v 3 h 3 l 8 -8 l -3 -3 l -8 8 Z m 3 2 H 1 v -2 h 1 v 1 h 1 v 1 Z m 10.3 -9.3 L 12 6 L 9 3 l 1.3 -1.3 a 0.996 0.996 0 0 1 1.41 0 l 1.59 1.59 c 0.39 0.39 0.39 1.02 0 1.41 Z" style="
        fill: white;
        width: 1px;
        height: 1px;
    "></path></svg><span style="
        position: relative;
        left: -2px;
    ">수정</span></button>
    <button type="button" class="btn btn-danger knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}" style="
        position: absolute;
        top: 40px;
        left: 10px;
    "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="
    fill: white;
    width: 16px;
    height: 16px;
    position: relative;
    left: -5px;
    margin: 5px;
"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.61193 6.61193 1.5 6.75 1.5H9.25C9.38807 1.5 9.5 1.61193 9.5 1.75V3H6.5V1.75ZM11 1.75V3H13.25C13.6642 3 14 3.33579 14 3.75C14 4.16421 13.6642 4.5 13.25 4.5H2.75C2.33579 4.5 2 4.16421 2 3.75C2 3.33579 2.33579 3 2.75 3H5V1.75C5 0.783502 5.7835 0 6.75 0H9.25C10.2165 0 11 0.783502 11 1.75ZM4.49627 6.67537C4.45506 6.26321 4.08753 5.9625 3.67537 6.00372C3.26321 6.04493 2.9625 6.41247 3.00372 6.82462L3.66367 13.4241C3.75313 14.3187 4.50592 15 5.40498 15H10.595C11.4941 15 12.2469 14.3187 12.3363 13.4241L12.9963 6.82462C13.0375 6.41247 12.7368 6.04493 12.3246 6.00372C11.9125 5.9625 11.5449 6.26321 11.5037 6.67537L10.8438 13.2749C10.831 13.4027 10.7234 13.5 10.595 13.5H5.40498C5.27655 13.5 5.169 13.4027 5.15622 13.2749L4.49627 6.67537Z"></path></svg><span style="
        position: relative;
        left: -2px;
    ">삭제</span></button>
            ${el}
    </div>
    `);});
    if(presetData[currentPreset].classes.length >= 8) presetData[currentPreset].isMaxClasses = true;
    if(presetData[currentPreset].isMaxClasses) $('.knn_stack_addContainer').css({display: 'none'});
    $('.knn_stack_addButton').click(() => {
        var clsid = presetData[currentPreset].classes.length + 1;
        presetData[currentPreset].classes.push(`클래스 ${clsid}`);
        presetData[currentPreset].datas[`클래스 ${clsid}`] = {
            name: `클래스 ${clsid}`,
            images: []
        };
        presetData[currentPreset].classId[`클래스 ${clsid}`] = clsid;
        presetData[currentPreset].usingIds.push(clsid);
        if(presetData[currentPreset].isMaxClasses) return;
        if(presetData[currentPreset].classes.length == 8) {presetData[currentPreset].isMaxClasses = true;$('.knn_stack_addContainer').css({display: 'none'});}
        modifyClass(presetData[currentPreset].datas[`클래스 ${clsid}`]);
    });
    $('.knnResultShow').click(() => {
        var res = window.aiResult;
        $($('.entrylmsModalCommon div')[1]).append(resultContainer);
        $('.knnResultContainerClose').click(() => {
            $('.knnResultRootContainer').remove();
        });
        $('.knnResultResultProbability')[0].innerText = (res.result.confidences.result * 100).toString() + '%';
        $('.knnResultResult')[0].innerText = res.result.label;
        Object.keys(res.confidences).forEach((el,i) => {
            $('.knnResultMinifiedList').append(`<button type="button" class="list-group-item list-group-item-action" style="width: 80%;"><div style="
                text-overflow: ellipsis;
                width: 130px;
                white-space: nowrap;
                overflow: hidden;
                display: inline-block;
            ">${el}</div><div style="
                color: dodgerblue;
                display: inline-block;
                float: right;
            ">${res.confidences[el].result * 100}%</div></button>`);
            $('.knnResultDetailList').append(`<div style="
                width: 100%;
                border-bottom: 1px lightgrey solid;
                margin-bottom: 10px;
            " class="knnResultDetailRow knnResultDetailRow${i}"><div style="
                position: absolute;
                width: 200px;
                height: 30px;
                left: 76%;
            " class="knnResultDetailRowProgress${i} knnResultDetailRowProgress"><div style="
                position: absolute;
                width: 0px;
                height: 30px;
                background: #E67701;
                border-radius: 10px;
            "></div><div style="
                width: 200px;
                height: 30px;
                background: #E67701;
                border-radius: 10px;
                opacity: 0.5;
            "></div></div><h2 style="
                color: black;
                padding-left: 20px;
            ">${el}<span style="
                color: black;
                text-align: left;
                font-size: 16px;
                position: relative;
                left: 10px;
            ">정확도 ${res.confidences[el].result * 100}%</span></h2></div>`);
        });
        var count = 0;
        window.interval = setInterval(() => {
            if(count == Object.keys(res.confidences).length) {clearInterval(window.interval); return;}
            $($(`.knnResultDetailRowProgress${count}`).children('div')[0]).css({width:'0px'}).animate({width:res.confidences[Object.keys(res.confidences)[count]].result * 200},700);
            count++;
        }, 200);
    });
    Object.keys(presetData[currentPreset].classId).forEach(el => {
        $(`.knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
            modifyClass(presetData[currentPreset].datas[el]);
        });
        $(`.knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
            deleteClass(el);
        });
    });
    function deleteClass(el) {
        if(presetData[currentPreset].classes.length <= 2) return alert('클래스는 최소 2개 있어야 합니다.'),undefined;
        if(!confirm('삭제 하시겠습니까?')) return;
        if(presetData[currentPreset].classes.length <= 8) {
            $('.knn_stack_addContainer').css({display: 'block'})
            presetData[currentPreset].isMaxClasses = false;
        };
        presetData[currentPreset].classes.splice(presetData[currentPreset].classes.indexOf(el),1);
        presetData[currentPreset].usingIds.splice(presetData[currentPreset].usingIds.indexOf(presetData[currentPreset].classId[el]),1);
        delete presetData[currentPreset].classId[el];
        delete presetData[currentPreset].datas[el];
        $('.build--stack.knn_stack_contanier').remove();
        presetData[currentPreset].classes.forEach(el => {$('.container__build').append(`
        <div class="build--stack knn_stack_contanier">
            <button type="button" class="btn btn-primary knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}" style="
                position: absolute;
                top: 85px;
                left: 10px;
                background-color: #5f39dd;
                border-color: #5f39dd;
            "><svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" style="width: 15px;margin: 5px;position: relative;left: -5px;"><path fill-rule="evenodd" d="M 0 12 v 3 h 3 l 8 -8 l -3 -3 l -8 8 Z m 3 2 H 1 v -2 h 1 v 1 h 1 v 1 Z m 10.3 -9.3 L 12 6 L 9 3 l 1.3 -1.3 a 0.996 0.996 0 0 1 1.41 0 l 1.59 1.59 c 0.39 0.39 0.39 1.02 0 1.41 Z" style="
                fill: white;
                width: 1px;
                height: 1px;
            "></path></svg><span style="
                position: relative;
                left: -2px;
            ">수정</span></button>
            <button type="button" class="btn btn-danger knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}" style="
                position: absolute;
                top: 40px;
                left: 10px;
            "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="
            fill: white;
            width: 16px;
            height: 16px;
            position: relative;
            left: -5px;
            margin: 5px;
        "><path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.61193 6.61193 1.5 6.75 1.5H9.25C9.38807 1.5 9.5 1.61193 9.5 1.75V3H6.5V1.75ZM11 1.75V3H13.25C13.6642 3 14 3.33579 14 3.75C14 4.16421 13.6642 4.5 13.25 4.5H2.75C2.33579 4.5 2 4.16421 2 3.75C2 3.33579 2.33579 3 2.75 3H5V1.75C5 0.783502 5.7835 0 6.75 0H9.25C10.2165 0 11 0.783502 11 1.75ZM4.49627 6.67537C4.45506 6.26321 4.08753 5.9625 3.67537 6.00372C3.26321 6.04493 2.9625 6.41247 3.00372 6.82462L3.66367 13.4241C3.75313 14.3187 4.50592 15 5.40498 15H10.595C11.4941 15 12.2469 14.3187 12.3363 13.4241L12.9963 6.82462C13.0375 6.41247 12.7368 6.04493 12.3246 6.00372C11.9125 5.9625 11.5449 6.26321 11.5037 6.67537L10.8438 13.2749C10.831 13.4027 10.7234 13.5 10.595 13.5H5.40498C5.27655 13.5 5.169 13.4027 5.15622 13.2749L4.49627 6.67537Z"></path></svg><span style="
                position: relative;
                left: -2px;
            ">삭제</span></button>
                        ${el}
        </div>
        `);});
        Object.keys(presetData[currentPreset].classId).forEach(el => {
            $(`.knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
                modifyClass(presetData[currentPreset].datas[el]);
            });
            $(`.knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
                deleteClass(el);
            });
        });
    }
    $('.knnFlowChartImageInput').on('change', () => {
        var fd = new FormData();
        fd.append('uploadFile0', $('.knnFlowChartImageInput')[0].files[0]);
        $.ajax({
            type: "POST",
            enctype: 'multipart/form-data',
            url: '/rest/picture/upload',
            data: fd,
            processData: false,
            contentType: false,
            cache: false,
            timeout: 600000,
            success: function (data) {
                window.knnUITargetImageURL = `/uploads/${data.uploads[0].origin.filename.substr(0,2)}/${data.uploads[0].origin.filename.substr(2,2)}/thumb/${data.uploads[0].origin.filename}.png`;
                $('.knnFlowChartUploadedImageView')[0].src = window.knnUITargetImageURL;
            }
        });
    });
    $('.knnFlowChartUploadImage').each((i,el) => {
        $(el).click(() => {
            $('.knnFlowChartImageInput').click();
        });
    });
    $('.knnFlowChartDetectImage').click(_e => {
        if(!(window.knnUITargetImageURL)) {
            alert('파일을 선택해주세요');
            return;
        }
        $('button.knnFlowChartUploadImage').prepend(`<span class="spinner-border spinner-border-sm loadingImage" role="status" aria-hidden="true"></span>`);
        $(`.knnLoadedImages_Preset${presetData[currentPreset].id}`).remove();
        $(document.body).prepend(`<div class="knnLoadedImages_Preset${presetData[currentPreset].id}"></div>`);
        Object.keys(presetData[currentPreset].datas).forEach(el => {
            $(`.knnLoadedImages_Preset${presetData[currentPreset].id}`).append(`<div class="knnLoadedImages_Preset${presetData[currentPreset].id}_Class${presetData[currentPreset].classId[el]}"></div>`);
            presetData[currentPreset].datas[el].images.forEach(_el => {
                $(`.knnLoadedImages_Preset${presetData[currentPreset].id}_Class${presetData[currentPreset].classId[el]}`).append(`
                    <img class="entryRemove knnLoadedImage knnLoadedImages_Preset${presetData[currentPreset].id}_Class${presetData[currentPreset].classId[el]}_Image${_el.match(/\/[a-zA-Z0-9]+.png/gi)[0].slice(1)}" src="${_el}"></img>
                `);
            });
        });
        setTimeout(() => {
            knnHandleAI(currentPreset).then(result => {
                console.log(`결과: ${result.result.label}, 정확도: ${result.result.confidences.result}`);
                window.aiResult = result;
                $('.knnResultShow')[0].setAttribute('class',$('.knnResultShow')[0].getAttribute('class').replace(/ disabled/gi,''));
                $('.loadingImage').remove();
            });
        },500);
    });
    $('.knnFlowChartRemoveAI').click(_e => {
        if(confirm('정말로 삭제하시겠습니까?')) {
        $('.knnModelArea')[0].innerHTML = `
<img src="https://lh3.googleusercontent.com/v7Kj9i1VJhtqj_70O2TIRZrXPocYxqdDpyhVR5Qe5D19YmCxXQNGHLaLYYUYh-WmsEU3UtkAKV1Ux17qxHrv7-Ko1iQ-nZ_0U7js8azyhpmEug-fxkBh1_zGYJV2rPjewCNZg3pcfvS8_VWcOH-y1GElbLELxwAsrbA9VkrBAGFJXe0mVaxgiLHffcsCh3mVUjujzP0N8fNW_L6V-k915U95d9QIxtYFfwxHQNRJNd7bLSUHx2631iQzdecERPjc-QodQbqeeNpCzg1nPXlfAxV0AnAXc1FObT_PpBotWHsU5wDiOCjjQRBo2QfVZzdvMj6nBFVVhBPc7zbrxQRXMG6lhaPdTQkBL7WzqIoZ6lw5845bVTwsSWtqFQFexbMbco9rxJChm58pPdvxxAgE4cSDcgiW4jMhpf4JWAKzUzJvjJ4giKnFfGQxTlGEVE0JC1aQhmubUtsmmqYit7Dn7hfK1e1KSdOFsZiJJZG-IqsBPD7hWdcpU-ZCP10kOV2woOMPgRG18_GOgYS2R17pSD3wwReQadjCaB-utJ3StjErZvGZ-DuwrqGReX5tgG86IyaJyV7M9wPMYPWfFwJsTLHms0ZomQGSqKZnfAwuTjYrL8GX2qU2T6FYjfR-1K8tIkIdMlrW94EB2OURgpVp_KLtf6Q8emwimPNIniy-VzaAXMGPW3DsfhRV7yc=w368-h220-no" style="
    position: relative;
    top: 150px;
    left: 50%;
    width: 368px;
    margin-left: -368px;
">
<div class="input-group mb-3" style="
    width: 600px;
    position: relative;
    left: 40%;
    transform: translateX(-50%);
    top: 200px;
">
  <input type="text" class="form-control knnHomeAddPresetName" placeholder="AI 이름" aria-label="AI 이름" aria-describedby="button-addon2">
  <div class="input-group-append" style="
">
    <button class="btn btn-outline-success knnHomeAddPreset" type="button" id="button-addon2">만들기</button>
  </div>
</div>
        `;
        $('.knnHomeAddPreset').click(() => {
            if($('.knnHomeAddPresetName').val().trim() == '') {
                alert('올바른 이름을 입력해주세요!');
                $('.knnHomeAddPresetName').val('');
                return;
            }
            if(Object.keys(presetData).indexOf($('.knnHomeAddPresetName').val().trim()) != -1) {
                alert('이 이름은 이미 사용중입니다!');
                $('.knnHomeAddPresetName').val('');
                return;
            }
            currentPreset = $('.knnHomeAddPresetName').val().trim();
            presetData[currentPreset] = {
                classes: ['클래스 1','클래스 2'],
                datas: {
                    '클래스 1': {
                        name: '클래스 1',
                        images: []
                    },
                    '클래스 2': {
                        name: '클래스 2',
                        images: []
                    }
                },
                classId: {
                    '클래스 1': 1,
                    '클래스 2': 2
                },
                usingIds: [1,2],
                id: usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1,
                isMaxClasses: false
            };
            usingPresetIds.push(usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1);
            $('.knnAddPresetName').val('');
            updateList();
            $($('button.knnPresets')[$('button.knnPresets').length - 1]).click();
        });
        delete presetData[currentPreset];
        updateList();
    }
    });
}
$('.knnFlowchartStyle').remove();
function modifyClass(currentModifingClassData) {
    $('.knnModelArea')[0].innerHTML = `
<section class="container" style="
            width: 100%;
            padding: 0px;
            margin: 0px;
            position: absolute;
            height: 760px;
            margin-top: 10px;
            margin-left: auto;
            margin-right: auto;
            display: table;
">
<div style="
    margin: 10px 10px 0px 10px;
">
<button type="button" class="btn knnModifingPresetBack" style="
    width: 32px;
    height: 32px;
    background: #5f39dd;
    border-radius: 50%;
    box-sizing: border-box;
"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="
    position: relative;
    top: 50%;
    margin-top: -30px;
    left: -5px;
"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.78033 1.96967C7.07322 2.26256 7.07322 2.73744 6.78033 3.03033L3.81066 6H10.25C12.8733 6 15 8.12663 15 10.75V13.25C15 13.6642 14.6642 14 14.25 14C13.8358 14 13.5 13.6642 13.5 13.25V10.75C13.5 8.95507 12.0449 7.5 10.25 7.5H3.81066L6.78033 10.4697C7.07322 10.7626 7.07322 11.2374 6.78033 11.5303C6.48744 11.8232 6.01256 11.8232 5.71967 11.5303L1.46967 7.28033C1.17678 6.98744 1.17678 6.51256 1.46967 6.21967L5.71967 1.96967C6.01256 1.67678 6.48744 1.67678 6.78033 1.96967Z" style="
    fill: white;
"></path></svg></button><input class="knnModifingPresetPresetName" style="
    border-radius: 100px;
    height: 32px;
    box-sizing: border-box;
    margin-left: 10px;
    width: 90%;
    padding: 10px;
" maxlength="30"></div><input type="file" class="entryRemove knnModifingClassImageInput" accept=".png,.jpg,.jpeg" multiple>

<div style="
    width: 100%;
    height: 90%;
    background: #F9F9F9;
    margin-top: 30px;
    box-shadow: 0px 0px 30px 0px #e6e6e6;
    border-radius: 30px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
" class="knnModifingClassImageList">
<div class="knnModifingClassImageAdd" style="
    margin: 20px;
    width: 100px;
    height: 150px;
">
<button class="knnModifingClassImageAddButton btn" style="
    width: 100%;
    height: 100%;
    background: #5f39dd;
    border-radius: 20px;
">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.7499 4.5C12.1641 4.5 12.4999 4.83579 12.4999 5.25V11H18.25C18.6642 11 19 11.3358 19 11.75C19 12.1642 18.6642 12.5 18.25 12.5H12.4999V18.25C12.4999 18.6642 12.1641 19 11.7499 19C11.3357 19 10.9999 18.6642 10.9999 18.25V12.5H5.25C4.83579 12.5 4.5 12.1642 4.5 11.75C4.5 11.3358 4.83579 11 5.25 11H10.9999V5.25C10.9999 4.83579 11.3357 4.5 11.7499 4.5Z" style="
    fill: white;
"></path></svg>
</button>
</div>
</div></section>`;
    $('.knnModifingPresetBack').click(() => {
        if(presetData[currentPreset].datas[currentModifingClassData.name].images.length < 4) {
            alert('사진을 5개 이상 올려주세요');
            return;
        }
        if($('.knnModifingPresetPresetName').val().trim() == '') {
            alert('올바른 클래스 이름을 적어주세요');
            return;
        }
        if(currentModifingClassData.name != $('.knnModifingPresetPresetName').val().trim() && presetData[currentPreset].classes.indexOf($('.knnModifingPresetPresetName').val().trim()) != -1) {
            alert('이 이름은 이미 사용중입니다');
            return;
        }
        if(currentModifingClassData.name != $('.knnModifingPresetPresetName').val().trim()) {
            var oldClassName = currentModifingClassData.name;
            currentModifingClassData.name = $('.knnModifingPresetPresetName').val().trim();
            var indexTemp = presetData[currentPreset].classes.indexOf(oldClassName);
            presetData[currentPreset].classes.splice(presetData[currentPreset].classes.indexOf(oldClassName),1);
            presetData[currentPreset].classes.splice(indexTemp,0,currentModifingClassData.name);
            var classIdTemp0 = presetData[currentPreset].classId;
            var classIdTemp1 = presetData[currentPreset].classId[oldClassName];
            delete classIdTemp0[oldClassName];
            classIdTemp0[currentModifingClassData.name] = classIdTemp1;
            presetData[currentPreset].classId = classIdTemp0;
            var classTemp0 = presetData[currentPreset].datas[oldClassName];
            classTemp0.name = currentModifingClassData.name;
            presetData[currentPreset].datas[currentModifingClassData.name] = classTemp0;
            delete presetData[currentPreset].datas[oldClassName];
        }
        $('.knnModelArea')[0].innerHTML = flowChart;
        $('.knnResultShow').click(() => {
            var res = window.aiResult;
            $($('.entrylmsModalCommon div')[1]).append(resultContainer);
            $('.knnResultContainerClose').click(() => {
                $('.knnResultRootContainer').remove();
            });
            $('.knnResultResultProbability')[0].innerText = (res.result.confidences.result * 100).toString() + '%';
            $('.knnResultResult')[0].innerText = res.result.label;
            Object.keys(res.confidences).forEach((el,i) => {
                $('.knnResultMinifiedList').append(`<button type="button" class="list-group-item list-group-item-action" style="width: 80%;"><div style="
                    text-overflow: ellipsis;
                    width: 130px;
                    white-space: nowrap;
                    overflow: hidden;
                    display: inline-block;
                ">${el}</div><div style="
                    color: dodgerblue;
                    display: inline-block;
                    float: right;
                ">${res.confidences[el].result * 100}%</div></button>`);
                $('.knnResultDetailList').append(`<div style="
                    width: 100%;
                    border-bottom: 1px lightgrey solid;
                    margin-bottom: 10px;
                " class="knnResultDetailRow knnResultDetailRow${i}"><div style="
                    position: absolute;
                    width: 200px;
                    height: 30px;
                    left: 76%;
                " class="knnResultDetailRowProgress${i} knnResultDetailRowProgress"><div style="
                    position: absolute;
                    width: 0px;
                    height: 30px;
                    background: #E67701;
                    border-radius: 10px;
                "></div><div style="
                    width: 200px;
                    height: 30px;
                    background: #E67701;
                    border-radius: 10px;
                    opacity: 0.5;
                "></div></div><h2 style="
                    color: black;
                    padding-left: 20px;
                ">${el}<span style="
                    color: black;
                    text-align: left;
                    font-size: 16px;
                    position: relative;
                    left: 10px;
                ">정확도 ${res.confidences[el].result * 100}%</span></h2></div>`);
            });
            var count = 0;
            window.interval = setInterval(() => {
                if(count == Object.keys(res.confidences).length) {clearInterval(window.interval); return;}
                $($(`.knnResultDetailRowProgress${count}`).children('div')[0]).css({width:'0px'}).animate({width:res.confidences[Object.keys(res.confidences)[count]].result * 200},700);
                count++;
            }, 200);
        });
        presetData[currentPreset].classes.forEach(el => {$('.container__build').append(`
        <div class="build--stack knn_stack_contanier">
            <button type="button" class="btn btn-primary knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}" style="
                position: absolute;
                top: 85px;
                left: 10px;
                background-color: #5f39dd;
                border-color: #5f39dd;
            "><svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" style="width: 15px;margin: 5px;position: relative;left: -5px;"><path fill-rule="evenodd" d="M 0 12 v 3 h 3 l 8 -8 l -3 -3 l -8 8 Z m 3 2 H 1 v -2 h 1 v 1 h 1 v 1 Z m 10.3 -9.3 L 12 6 L 9 3 l 1.3 -1.3 a 0.996 0.996 0 0 1 1.41 0 l 1.59 1.59 c 0.39 0.39 0.39 1.02 0 1.41 Z" style="
                fill: white;
                width: 1px;
                height: 1px;
            "></path></svg><span style="
                position: relative;
                left: -2px;
            ">수정</span></button>
            <button type="button" class="btn btn-danger knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}" style="
                position: absolute;
                top: 40px;
                left: 10px;
            "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="
            fill: white;
            width: 16px;
            height: 16px;
            position: relative;
            left: -5px;
            margin: 5px;
        "><path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.61193 6.61193 1.5 6.75 1.5H9.25C9.38807 1.5 9.5 1.61193 9.5 1.75V3H6.5V1.75ZM11 1.75V3H13.25C13.6642 3 14 3.33579 14 3.75C14 4.16421 13.6642 4.5 13.25 4.5H2.75C2.33579 4.5 2 4.16421 2 3.75C2 3.33579 2.33579 3 2.75 3H5V1.75C5 0.783502 5.7835 0 6.75 0H9.25C10.2165 0 11 0.783502 11 1.75ZM4.49627 6.67537C4.45506 6.26321 4.08753 5.9625 3.67537 6.00372C3.26321 6.04493 2.9625 6.41247 3.00372 6.82462L3.66367 13.4241C3.75313 14.3187 4.50592 15 5.40498 15H10.595C11.4941 15 12.2469 14.3187 12.3363 13.4241L12.9963 6.82462C13.0375 6.41247 12.7368 6.04493 12.3246 6.00372C11.9125 5.9625 11.5449 6.26321 11.5037 6.67537L10.8438 13.2749C10.831 13.4027 10.7234 13.5 10.595 13.5H5.40498C5.27655 13.5 5.169 13.4027 5.15622 13.2749L4.49627 6.67537Z"></path></svg><span style="
                position: relative;
                left: -2px;
            ">삭제</span></button>
                        ${el}
        </div>
        `);});
        if(presetData[currentPreset].classes.length >= 8) presetData[currentPreset].isMaxClasses = true;
        if(presetData[currentPreset].isMaxClasses) $('.knn_stack_addContainer').css({display: 'none'});
        $('.knn_stack_addButton').click(() => {
            var clsid = presetData[currentPreset].classes.length + 1;
            presetData[currentPreset].classes.push(`클래스 ${clsid}`);
            presetData[currentPreset].datas[`클래스 ${clsid}`] = {
                name: `클래스 ${clsid}`,
                images: []
            };
            presetData[currentPreset].classId[`클래스 ${clsid}`] = clsid;
            presetData[currentPreset].usingIds.push(clsid);
            if(presetData[currentPreset].isMaxClasses) return;
            if(presetData[currentPreset].classes.length == 8) {presetData[currentPreset].isMaxClasses = true;$('.knn_stack_addContainer').css({display: 'none'});}
            modifyClass(presetData[currentPreset].datas[`클래스 ${clsid}`]);
        });
        Object.keys(presetData[currentPreset].classId).forEach(el => {
            $(`.knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
                modifyClass(presetData[currentPreset].datas[el]);
            });
            $(`.knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
                deleteClass(el);
            });
        });
        function deleteClass(el) {
            if(presetData[currentPreset].classes.length <= 2) return alert('클래스는 최소 2개 있어야 합니다.'),undefined;
            if(!confirm('삭제 하시겠습니까?')) return;
            if(presetData[currentPreset].classes.length <= 8) {
                $('.knn_stack_addContainer').css({display: 'block'});
                presetData[currentPreset].isMaxClasses = false;
            }
            presetData[currentPreset].classes.splice(presetData[currentPreset].classes.indexOf(el),1);
            presetData[currentPreset].usingIds.splice(presetData[currentPreset].usingIds.indexOf(presetData[currentPreset].classId[el]),1);
            delete presetData[currentPreset].classId[el];
            delete presetData[currentPreset].datas[el];
            $('.build--stack.knn_stack_contanier').remove();
            presetData[currentPreset].classes.forEach(el => {$('.container__build').append(`
            <div class="build--stack knn_stack_contanier">
                <button type="button" class="btn btn-primary knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}" style="
                    position: absolute;
                    top: 85px;
                    left: 10px;
                    background-color: #5f39dd;
                    border-color: #5f39dd;
                "><svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" style="width: 15px;margin: 5px;position: relative;left: -5px;"><path fill-rule="evenodd" d="M 0 12 v 3 h 3 l 8 -8 l -3 -3 l -8 8 Z m 3 2 H 1 v -2 h 1 v 1 h 1 v 1 Z m 10.3 -9.3 L 12 6 L 9 3 l 1.3 -1.3 a 0.996 0.996 0 0 1 1.41 0 l 1.59 1.59 c 0.39 0.39 0.39 1.02 0 1.41 Z" style="
                    fill: white;
                    width: 1px;
                    height: 1px;
                "></path></svg><span style="
                    position: relative;
                    left: -2px;
                ">수정</span></button>
                <button type="button" class="btn btn-danger knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}" style="
                    position: absolute;
                    top: 40px;
                    left: 10px;
                "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="
                fill: white;
                width: 16px;
                height: 16px;
                position: relative;
                left: -5px;
                margin: 5px;
            "><path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.61193 6.61193 1.5 6.75 1.5H9.25C9.38807 1.5 9.5 1.61193 9.5 1.75V3H6.5V1.75ZM11 1.75V3H13.25C13.6642 3 14 3.33579 14 3.75C14 4.16421 13.6642 4.5 13.25 4.5H2.75C2.33579 4.5 2 4.16421 2 3.75C2 3.33579 2.33579 3 2.75 3H5V1.75C5 0.783502 5.7835 0 6.75 0H9.25C10.2165 0 11 0.783502 11 1.75ZM4.49627 6.67537C4.45506 6.26321 4.08753 5.9625 3.67537 6.00372C3.26321 6.04493 2.9625 6.41247 3.00372 6.82462L3.66367 13.4241C3.75313 14.3187 4.50592 15 5.40498 15H10.595C11.4941 15 12.2469 14.3187 12.3363 13.4241L12.9963 6.82462C13.0375 6.41247 12.7368 6.04493 12.3246 6.00372C11.9125 5.9625 11.5449 6.26321 11.5037 6.67537L10.8438 13.2749C10.831 13.4027 10.7234 13.5 10.595 13.5H5.40498C5.27655 13.5 5.169 13.4027 5.15622 13.2749L4.49627 6.67537Z"></path></svg><span style="
                    position: relative;
                    left: -2px;
                ">삭제</span></button>
                            ${el}
            </div>
            `);});
            Object.keys(presetData[currentPreset].classId).forEach(el => {
                $(`.knnClassModifyBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
                    modifyClass(presetData[currentPreset].datas[el]);
                });
                $(`.knnClassDeleteBtn_Class-${presetData[currentPreset].classId[el]}`).click(() => {
                    deleteClass(el);
                });
            });
        }
        $('.knnFlowChartImageInput').on('change', () => {
            var fd = new FormData();
            fd.append('uploadFile0', $('.knnFlowChartImageInput')[0].files[0]);
            $.ajax({
                type: "POST",
                enctype: 'multipart/form-data',
                url: '/rest/picture/upload',
                data: fd,
                processData: false,
                contentType: false,
                cache: false,
                timeout: 600000,
                success: function (data) {
                    window.knnUITargetImageURL = `/uploads/${data.uploads[0].origin.filename.substr(0,2)}/${data.uploads[0].origin.filename.substr(2,2)}/thumb/${data.uploads[0].origin.filename}.png`;
                    $('.knnFlowChartUploadedImageView')[0].src = window.knnUITargetImageURL;
                }
            });
        });
        $('.knnFlowChartUploadImage').each((i,el) => {
            $(el).click(() => {
                $('.knnFlowChartImageInput').click();
            });
        });
        $('.knnFlowChartDetectImage').click(_e => {
            if(!(window.knnUITargetImageURL)) {
                alert('파일을 선택해주세요');
                return;
            }
            $('button.knnFlowChartUploadImage').prepend(`<span class="spinner-border spinner-border-sm loadingImage" role="status" aria-hidden="true"></span>`);
            $(`.knnLoadedImages_Preset${presetData[currentPreset].id}`).remove();
            $(document.body).prepend(`<div class="knnLoadedImages_Preset${presetData[currentPreset].id}"></div>`);
            Object.keys(presetData[currentPreset].datas).forEach(el => {
                $(`.knnLoadedImages_Preset${presetData[currentPreset].id}`).append(`<div class="knnLoadedImages_Preset${presetData[currentPreset].id}_Class${presetData[currentPreset].classId[el]}"></div>`);
                presetData[currentPreset].datas[el].images.forEach(_el => {
                    $(`.knnLoadedImages_Preset${presetData[currentPreset].id}_Class${presetData[currentPreset].classId[el]}`).append(`
                        <img class="entryRemove knnLoadedImage knnLoadedImages_Preset${presetData[currentPreset].id}_Class${presetData[currentPreset].classId[el]}_Image${_el.match(/\/[a-zA-Z0-9]+.png/gi)[0].slice(1)}" src="${_el}"></img>
                    `);
                });
            });
            setTimeout(() => {
                knnHandleAI(currentPreset).then(result => {
                    console.log(`결과: ${result.result.label}, 정확도: ${result.result.confidences.result}`);
                    window.aiResult = result;
                    $('.knnResultShow')[0].setAttribute('class',$('.knnResultShow')[0].getAttribute('class').replace(/ disabled/gi,''));
                    $('.loadingImage').remove();
                });
            },500);
        });
        $('.knnFlowChartRemoveAI').click(_e => {
            if(confirm('정말로 삭제하시겠습니까?')) {
            $('.knnModelArea')[0].innerHTML = `
    <img src="https://lh3.googleusercontent.com/v7Kj9i1VJhtqj_70O2TIRZrXPocYxqdDpyhVR5Qe5D19YmCxXQNGHLaLYYUYh-WmsEU3UtkAKV1Ux17qxHrv7-Ko1iQ-nZ_0U7js8azyhpmEug-fxkBh1_zGYJV2rPjewCNZg3pcfvS8_VWcOH-y1GElbLELxwAsrbA9VkrBAGFJXe0mVaxgiLHffcsCh3mVUjujzP0N8fNW_L6V-k915U95d9QIxtYFfwxHQNRJNd7bLSUHx2631iQzdecERPjc-QodQbqeeNpCzg1nPXlfAxV0AnAXc1FObT_PpBotWHsU5wDiOCjjQRBo2QfVZzdvMj6nBFVVhBPc7zbrxQRXMG6lhaPdTQkBL7WzqIoZ6lw5845bVTwsSWtqFQFexbMbco9rxJChm58pPdvxxAgE4cSDcgiW4jMhpf4JWAKzUzJvjJ4giKnFfGQxTlGEVE0JC1aQhmubUtsmmqYit7Dn7hfK1e1KSdOFsZiJJZG-IqsBPD7hWdcpU-ZCP10kOV2woOMPgRG18_GOgYS2R17pSD3wwReQadjCaB-utJ3StjErZvGZ-DuwrqGReX5tgG86IyaJyV7M9wPMYPWfFwJsTLHms0ZomQGSqKZnfAwuTjYrL8GX2qU2T6FYjfR-1K8tIkIdMlrW94EB2OURgpVp_KLtf6Q8emwimPNIniy-VzaAXMGPW3DsfhRV7yc=w368-h220-no" style="
        position: relative;
        top: 150px;
        left: 50%;
        width: 368px;
        margin-left: -368px;
    ">
    <div class="input-group mb-3" style="
        width: 600px;
        position: relative;
        left: 40%;
        transform: translateX(-50%);
        top: 200px;
    ">
      <input type="text" class="form-control knnHomeAddPresetName" placeholder="AI 이름" aria-label="AI 이름" aria-describedby="button-addon2">
      <div class="input-group-append" style="
    ">
        <button class="btn btn-outline-success knnHomeAddPreset" type="button" id="button-addon2">만들기</button>
      </div>
    </div>
            `;
            $('.knnHomeAddPreset').click(() => {
                if($('.knnHomeAddPresetName').val().trim() == '') {
                    alert('올바른 이름을 입력해주세요!');
                    $('.knnHomeAddPresetName').val('');
                    return;
                }
                if(Object.keys(presetData).indexOf($('.knnHomeAddPresetName').val().trim()) != -1) {
                    alert('이 이름은 이미 사용중입니다!');
                    $('.knnHomeAddPresetName').val('');
                    return;
                }
                currentPreset = $('.knnHomeAddPresetName').val().trim();
                presetData[currentPreset] = {
                    classes: ['클래스 1','클래스 2'],
                    datas: {
                        '클래스 1': {
                            name: '클래스 1',
                            images: []
                        },
                        '클래스 2': {
                            name: '클래스 2',
                            images: []
                        }
                    },
                    classId: {
                        '클래스 1': 1,
                        '클래스 2': 2
                    },
                    usingIds: [1,2],
                    id: usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1,
                    isMaxClasses: false
                };
                usingPresetIds.push(usingPresetIds.length == 0 ? 1 : usingPresetIds[usingPresetIds.length-1] + 1);
                $('.knnAddPresetName').val('');
                updateList();
                $($('button.knnPresets')[$('button.knnPresets').length - 1]).click();
            });
            delete presetData[currentPreset];
            updateList();
        }
        });
    });
    currentModifingClassData.images.forEach((el,i) => {
        $('.knnModifingClassImageList').prepend(`
<div class="knnModifingClassImage knnModifingClassImage_${i}" style="
    margin: 20px;
    width: 100px;
    height: 150px;
">
<button class="knnModifingClassImageButton btn" style="
    width: 100%;
    height: 100%;
    background-image: url(${el});
    border-radius: 20px;
    background-repeat: no-repeat;
    background-size: contain;
    background-blend-mode: darken;
    border: 1px grey solid;
    background-position: center;
">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" class="knnModifingClassImageButtonDeleteSvg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 1.75V3H21.25C21.6642 3 22 3.33579 22 3.75C22 4.16421 21.6642 4.5 21.25 4.5H2.75C2.33579 4.5 2 4.16421 2 3.75C2 3.33579 2.33579 3 2.75 3H8V1.75C8 0.783502 8.7835 0 9.75 0H14.25C15.2165 0 16 0.783502 16 1.75ZM9.5 1.75C9.5 1.61193 9.61193 1.5 9.75 1.5H14.25C14.3881 1.5 14.5 1.61193 14.5 1.75V3H9.5V1.75Z" style="
    fill: white;
"></path>
  <path d="M4.99657 6.17775C4.95667 5.76546 4.5901 5.46358 4.17781 5.50348C3.76552 5.54338 3.46364 5.90995 3.50354 6.32224L4.91609 20.9186C5.0029 21.8156 5.75674 22.5 6.65795 22.5H17.3422C18.2434 22.5 18.9972 21.8156 19.084 20.9186L20.4966 6.32224C20.5365 5.90995 20.2346 5.54338 19.8223 5.50348C19.41 5.46358 19.0434 5.76546 19.0035 6.17775L17.591 20.7741C17.5786 20.9022 17.4709 21 17.3422 21H6.65795C6.52921 21 6.42151 20.9022 6.40911 20.7741L4.99657 6.17775Z" style="
    fill: white;
"></path>
  <path d="M9.20598 7.50129C9.61948 7.47696 9.97441 7.79245 9.99873 8.20595L10.4987 16.706C10.5231 17.1194 10.2076 17.4744 9.79406 17.4987C9.38057 17.523 9.02564 17.2075 9.00132 16.794L8.50132 8.29403C8.47699 7.88054 8.79248 7.52561 9.20598 7.50129Z" style="
    fill: white;
"></path>
  <path d="M15.4987 8.29403C15.5231 7.88054 15.2076 7.52561 14.7941 7.50129C14.3806 7.47696 14.0256 7.79245 14.0013 8.20595L13.5013 16.706C13.477 17.1194 13.7925 17.4744 14.206 17.4987C14.6195 17.523 14.9744 17.2075 14.9987 16.794L15.4987 8.29403Z" style="
    fill: white;
"></path></svg>
</button>
</div>
        `);
    });
    const updateImageList = () => {
            currentModifingClassData = presetData[currentPreset].datas[currentModifingClassData.name];
            $('.knnModifingClassImage').remove();
            currentModifingClassData.images.forEach((el,i) => {
                $('.knnModifingClassImageList').prepend(`
        <div class="knnModifingClassImage knnModifingClassImage_${i}" style="
            margin: 20px;
            width: 100px;
            height: 150px;
        ">
        <button class="knnModifingClassImageButton btn" style="
            width: 100%;
            height: 100%;
            background: url(${el});
            border-radius: 20px;
            background-repeat: no-repeat;
            background-size: contain;
            background-blend-mode: darken;
            background-position: center;
            border: 1px grey solid;
        ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" class="knnModifingClassImageButtonDeleteSvg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 1.75V3H21.25C21.6642 3 22 3.33579 22 3.75C22 4.16421 21.6642 4.5 21.25 4.5H2.75C2.33579 4.5 2 4.16421 2 3.75C2 3.33579 2.33579 3 2.75 3H8V1.75C8 0.783502 8.7835 0 9.75 0H14.25C15.2165 0 16 0.783502 16 1.75ZM9.5 1.75C9.5 1.61193 9.61193 1.5 9.75 1.5H14.25C14.3881 1.5 14.5 1.61193 14.5 1.75V3H9.5V1.75Z" style="
            fill: white;
        "></path>
          <path d="M4.99657 6.17775C4.95667 5.76546 4.5901 5.46358 4.17781 5.50348C3.76552 5.54338 3.46364 5.90995 3.50354 6.32224L4.91609 20.9186C5.0029 21.8156 5.75674 22.5 6.65795 22.5H17.3422C18.2434 22.5 18.9972 21.8156 19.084 20.9186L20.4966 6.32224C20.5365 5.90995 20.2346 5.54338 19.8223 5.50348C19.41 5.46358 19.0434 5.76546 19.0035 6.17775L17.591 20.7741C17.5786 20.9022 17.4709 21 17.3422 21H6.65795C6.52921 21 6.42151 20.9022 6.40911 20.7741L4.99657 6.17775Z" style="
            fill: white;
        "></path>
          <path d="M9.20598 7.50129C9.61948 7.47696 9.97441 7.79245 9.99873 8.20595L10.4987 16.706C10.5231 17.1194 10.2076 17.4744 9.79406 17.4987C9.38057 17.523 9.02564 17.2075 9.00132 16.794L8.50132 8.29403C8.47699 7.88054 8.79248 7.52561 9.20598 7.50129Z" style="
            fill: white;
        "></path>
          <path d="M15.4987 8.29403C15.5231 7.88054 15.2076 7.52561 14.7941 7.50129C14.3806 7.47696 14.0256 7.79245 14.0013 8.20595L13.5013 16.706C13.477 17.1194 13.7925 17.4744 14.206 17.4987C14.6195 17.523 14.9744 17.2075 14.9987 16.794L15.4987 8.29403Z" style="
            fill: white;
        "></path></svg>
        </button>
        </div>
                `);});
    $('.knnModifingClassImage').each((i,el) => {
        $(`.knnModifingClassImage_${i}`).click(e => {
            var temp0;
            switch(e.target.tagName.toLowerCase()) {
                case 'svg':
                    temp0 = (
                        $(e.target).parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'').startsWith('/') ? 
                        $(e.target).parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'') :
                        '/'+$(e.target).parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'')
                    );break;
                case 'path':
                    temp0 = (
                        $(e.target).parent().parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'').startsWith('/') ? 
                        $(e.target).parent().parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'') :
                        '/'+$(e.target).parent().parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'')
                    );break;
                case 'button':
                    temp0 = (
                        $(e.target).css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'').startsWith('/') ? 
                        $(e.target).css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'') :
                        '/'+$(e.target).css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'')
                    );break;
            };
            presetData[currentPreset].datas[currentModifingClassData.name].images.splice(presetData[currentPreset].datas[currentModifingClassData.name].images.indexOf(
                temp0
            ),1);
            updateImageList();
        });
    });
}
    $('.knnModifingClassImage').each((i,el) => {
        $(`.knnModifingClassImage_${i}`).click(e => {
            var temp0;
            switch(e.target.tagName.toLowerCase()) {
                case 'svg':
                    temp0 = (
                        $(e.target).parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'').startsWith('/') ? 
                        $(e.target).parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'') :
                        '/'+$(e.target).parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'')
                    );break;
                case 'path':
                    temp0 = (
                        $(e.target).parent().parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'').startsWith('/') ? 
                        $(e.target).parent().parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'') :
                        '/'+$(e.target).parent().parent().parent().children('button').css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'')
                    );break;
                case 'button':
                    temp0 = (
                        $(e.target).css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'').startsWith('/') ? 
                        $(e.target).css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'') :
                        '/'+$(e.target).css('background-image').slice(4,-1).replace('https://playentry.org','').replace(/\"/gi,'')
                    );break;
            };
            presetData[currentPreset].datas[currentModifingClassData.name].images.splice(presetData[currentPreset].datas[currentModifingClassData.name].images.indexOf(
                temp0
            ),1);
            updateImageList();
        });
    });
    $('.knnModifingClassImageAddButton').click(() => {
        $('.knnModifingClassImageInput').click();
    });
    $('.knnModifingPresetPresetName').val(currentModifingClassData.name);
    $('.knnModifingClassImageInput').on('change', () => {
        var files = $('.knnModifingClassImageInput')[0].files;
        if(files.length > 9) {
            alert('한번에 파일을 10개이상 업로드 할수 없습니다.');
            return;
        }
        var fd = new FormData();
        for(let i = 0; i < files.length; i++) {
            fd.append(`uploadFile${i}`,files[i]);
        };
        $.ajax({
            type: "POST",
            enctype: 'multipart/form-data',
            url: '/rest/picture/upload',
            data: fd,
            processData: false,
            contentType: false,
            cache: false,
            timeout: 600000,
            success: function (data) {
                data.uploads.forEach((el,i) => {
                    presetData[currentPreset].datas[currentModifingClassData.name].images.push(`/uploads/${el.origin.filename.substr(0,2)}/${el.origin.filename.substr(2,2)}/thumb/${el.origin.filename}.png`);
                    updateImageList();
                });
            },
            error: function (e) {
                alert('ERROR: ' + e.toString());
            }
        });
    });
}
$(document.head).append(`<style class="knnFlowchartStyle">
@import url("https://fonts.googleapis.com/css?family=Mukta:300,400,700");
.card,
.container__sources div,
.container__build div {
  line-height: 2;
  background: #fff;
  padding: 1.2rem 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 10px #e6e6e6;
}
.knnModifingClassImageButton:hover {
    background-color: red !important;
}
.knnModifingClassImageButton:hover .knnModifingClassImageButtonDeleteSvg {
    opacity: 1.0 !important;
}
.knnModifingClassImageButtonDeleteSvg {
    opacity: 0.0;
}
.knnModifingClassImageButtonDeleteSvg {
    transition: opacity 0.3s;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  min-height: 100vh;
  width: 100%;
  font-family: 'Mukta', sans-serif;
  color: #5f39dd;
  background: #5f39dd;
}
.container {
  margin: 5vh 2.5vw;
  padding: 15vh 0;
  background: #fff;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.container svg {
  height: 5rem;
}
.container svg line {
  stroke: #5f39dd;
  stroke-width: 3px;
  stroke-linecap: round;
  stroke-dasharray: 2px 20px;
  animation: animateline 5s linear both infinite;
}
h3 {
  font-size: 1.1rem;
  color: #411fb2;
}
p {
  font-size: 0.95rem;
  font-weight: 300;
}
.container__sources {
  display: flex;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f9f9f9;
  position: relative;
}
.container__sources div {
  text-align: left;
  margin: 0 1rem;
}
.container__build {
  padding: 10vh 10vw;
  border-radius: 8px;
  background: #f9f9f9;
  position: relative;
}
.container__build div {
  margin: 2rem 0;
  margin-top: 80px;
}
.container__build div svg {
  width: 4rem;
  height: auto;
  fill: #5f39dd;
}
.container__deploy {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  position: relative;
}
@media (max-width: 700px) {
  .container__sources {
    flex-direction: column;
  }
  .container__sources div {
    margin: 1rem 0;
  }
}
@-moz-keyframes animateline {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -5rem;
  }
}
@-webkit-keyframes animateline {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -5rem;
  }
}
@-o-keyframes animateline {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -5rem;
  }
}
@keyframes animateline {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -5rem;
  }
}
.build--stack {
    height: 130px;
    max-width: 150px;
    width: 100px;
    padding: 0px !important;
    margin-left: 5px !important;
    margin-right: 5px !important;
    position: relative;
    top: 40px;
}
</style>`);
}
async function knnHandleAI(currentPreset_,targetImage) {
    if (typeof tf == 'undefined' || typeof knnMobilenet == 'undefined' || typeof knn == 'undefined') throw new ReferenceError(`Please load TF.js and mobilnet, knn model.`);
    var _knn = knn.create();
    var labels = presetData[currentPreset_].classes
    Object.keys(presetData[currentPreset_].datas).forEach(el => {
        presetData[currentPreset_].datas[el].images.forEach(_el => {
            const img = tf.browser.fromPixels(document.getElementsByClassName(`knnLoadedImages_Preset${presetData[currentPreset_].id}_Class${presetData[currentPreset_].classId[el]}_Image${_el.match(/\/[a-zA-Z0-9]+.png/gi)[0].slice(1)}`)[0]);
            const logit = knnMobilenet.infer(img, 'conv_preds');
            _knn.addExample(logit, presetData[currentPreset_].classId[el]);
        });
    });
    if (targetImage) {
        $('#knnTargetImage').remove();
        $(document.body).append(`<img id="knnTargetImage" src="${targetImage}" style="display: none;">`);
    }
    const targetImg = targetImage ? tf.browser.fromPixels($('#knnTargetImage')[0]) : tf.browser.fromPixels($('.knnFlowChartUploadedImageView')[0]);
    const targetLogit = knnMobilenet.infer(targetImg, 'conv_preds');
    var result = (await (_knn.predictClass(targetLogit)));
    return {
        result: {
            label: labels[result.label - 1],
            id: presetData[currentPreset_].classId[labels[result.label - 1]],
            confidences: (() => {return returnvalue={},temp0=result.confidences,Object.keys(temp0).forEach(el=>{returnvalue[labels[el - 1]] = {result:temp0[el],id:presetData[currentPreset_].classId[labels[el - 1]]};}),returnvalue})()[labels[result.label - 1]]
        },
        confidences: (() => {return returnvalue={},temp0=result.confidences,Object.keys(temp0).forEach(el=>{returnvalue[labels[el - 1]] = {result:temp0[el],id:presetData[currentPreset_].classId[labels[el - 1]]};}),returnvalue})(),
        raw: result
    };
}
