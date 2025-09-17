// Lastik Danışmanı Car Brand Search 
$('#car_select_search').on('input', function () {
    const query = $(this).val().toLowerCase();
    $('#tire_search label').each(function () {
        const labelText = $(this).text().toLowerCase();
        const relatedInput = $('#' + $(this).attr('for'));

        if (labelText.includes(query)) {
            $(this).show();
            relatedInput.show();
        } else {
            $(this).hide();
            relatedInput.hide();
        }
    });
});
// Lastik Danışmanı Car Brand Show More
const visibleCount = 10;
const $inputs = $('#tire_search input[type="radio"]');
const $labels = $('#tire_search label');
$inputs.each(function (index) {
    if (index >= visibleCount) $(this).hide();
});
$labels.each(function (index) {
    if (index >= visibleCount) $(this).hide();
});
$('#toggle-brands').on('click', function () {
    const hidden = $('#tire_search input[type="radio"]:hidden').length > 0;

    if (hidden) {
        $inputs.show();
        $labels.show();
        $(this).text('Yüklenen Markaları Gizle');
    } else {
        $inputs.each(function (index) {
            if (index >= visibleCount) $(this).hide();
        });
        $labels.each(function (index) {
            if (index >= visibleCount) $(this).hide();
        });
        $(this).text('Tüm Markaları Göster');
    }
});

// Lastik Danışmanı Wizard
$(function () {
    $("#prev-btn-modal").on("click", function () {
        $('#smartwizard').smartWizard("prev");
    });
    $("#next-btn-modal").on("click", function () {
        $('#smartwizard').smartWizard("next");
    });
    // Step kontrolü
    $("#smartwizard").on("leaveStep", function (e, anchorObject, currentStepIdx, nextStepIdx, stepDirection) {
        // Validate only on forward movement  
        if (stepDirection == 'forward') {
            // Validete Car Search Radio Group
            if (currentStepIdx === 0) {
                if (!$('input[name="car_select"]:checked').val()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Araç Seçimi Gerekli',
                        text: 'Lütfen bir araç markası seçin.',
                        confirmButtonText: 'Tamam'
                    });
                    return false;
                }
            }
            // Validete Model Search Radio Group
            if (currentStepIdx === 1) {
                if (!$('input[name="model_select"]:checked').val()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Model Seçimi Gerekli',
                        text: 'Lütfen bir araç modeli seçin.',
                        confirmButtonText: 'Tamam'
                    });
                    return false;
                }
            }
            if (currentStepIdx === 2) {
                if (!$('input[name="submodel_select"]:checked').val()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Kasa Tipi Seçimi Gerekli',
                        text: 'Lütfen araç kasa tipi ve yılı seçin.',
                        confirmButtonText: 'Tamam'
                    });
                    return false;
                }
            }
        }
    });
    $("#smartwizard").on("showStep", function (e, anchorObject, stepIndex, stepDirection, stepPosition) {
        $("#prev-btn-modal").prop("disabled", stepPosition === 'first');
        if (stepPosition === "last") {
            $("#next-btn-modal").hide();
            $("#result-btn-modal").show();
        } else {
            $("#result-btn-modal").hide();
            $("#next-btn-modal").show();
        }
    });
    $('#smartwizard').smartWizard({
        selected: 0,
        theme: 'basic',
        enableUrlHash: false,
        transition: { animation: 'none' },
        toolbar: { showNextButton: false, showPreviousButton: false },
        anchor: {
            enableNavigation: true,
            enableDoneState: true,
            markPreviousStepsAsDone: true,
            unDoneOnBackNavigation: true
        }
    });
    // Modal Kapanınca Önceki Hali
    $('#tireSearch').on('hidden.bs.modal', function () {
        location.reload();
    });
});
function onFinish() {
    $("#smartwizard").addClass("d-none");
    $("#smartwizard-results").removeClass("d-none");
    $("#prev-btn-modal").hide();
    $("#prev-btn-modal").hide();
    let modalDialog = $("#tireSearch .modal-dialog");
    modalDialog.removeClass("modal-xl").addClass("modal-lg");
}