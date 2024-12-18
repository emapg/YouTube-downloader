$(document).ready(function() {
    $('#download-form').submit(function(event) {
        event.preventDefault();

        const url = $('#url').val();
        const format = $('#format').val();
        const quality = $('#quality').val();

        const downloadUrl = `/download?url=${encodeURIComponent(url)}&format=${format}&quality=${quality}`;
        window.location.href = downloadUrl;
    });
});
