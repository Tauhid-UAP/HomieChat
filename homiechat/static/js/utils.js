function copyCode(event){
    var copyText = document.createElement('textarea');
    textArea.innerHTML = event.srcElement.id;

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */

    /* Copy the text inside the text field */
    document.execCommand("copy");
}