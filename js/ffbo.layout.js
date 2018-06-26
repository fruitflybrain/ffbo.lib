$(".vis")
	.dblclick( function() {
		if ($(this).hasClass("vis-sm")) {
			$(".vis-hf-r").toggleClass("vis-sm vis-hf-r");
			$(".vis-lg").toggleClass("vis-sm vis-lg");
			$(this).toggleClass("vis-sm vis-lg");
		}
	})
	.mouseenter( function() {
		if ($(this).hasClass("vis-sm"))
			$(".vis-lg").toggleClass("vis-hf-r vis-lg");
	}).mouseleave( function() {
		if ($(this).hasClass("vis-sm"))
			$(".vis-hf-r").toggleClass("vis-hf-r vis-lg");
	});
