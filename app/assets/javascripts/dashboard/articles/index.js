var ArticleIndex = function() {
  var _this = this;

  this.fetching = false;
  this.$articles = $('#articles');
  this.$bulkbar = $('#bulkbar');
  this.$newCategoryForm = $('#new-category-form');

  $('#show-nav-button').on('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    $('#main-nav').addClass('appear');
  });

  $('#main-nav-background').on('click', function(event) {
    $('#main-nav').removeClass('appear');
  });

  this.connect(window, 'scroll.ArticleIndex', this.onScroll);
  this.$articles.on('click', '.article .title a', function(event) {
    _this.editArticle(event, this);
  });
  this.$articles.on('click', '.article', function(event) {
    _this.bulkSelect(event, this);
  });

  this.connect(this.$newCategoryForm, 'submit', this.createCategory);
  this.connect(this.$bulkbar.find('.cancel-button'), 'click', this.bulkCancel);
  this.connect(this.$bulkbar.find('.view-button'), 'click', this.view);
  this.connect(this.$bulkbar.find('.edit-button'), 'click', this.edit);
  this.connect(this.$bulkbar.find('.publish-button'), 'click', this.bulkPublish);
  this.connect(this.$bulkbar.find('.draft-button'), 'click', this.bulkDraft);
  this.connect(this.$bulkbar.find('.trash-button'), 'click', this.bulkTrash);
  this.connect(('#delete-modal .confirm-delete-button'), 'click', this.bulkDelete);
  this.connect(('#empty-trash-modal .confirm-empty-trash-button'), 'click', this.emptyTrash);

  this.$moveCategoryForm = $('#move-category-form');
  this.connect(this.$moveCategoryForm, 'submit', this.bulkMove);
  this.$moveCategoryForm.find('.dropdown').on('click', '.dropdown-menu li a', function(event) {
    _this.selectMoveCategory(event, this);
  });
};

ArticleIndex.prototype = {
  destroy: function() {
    $(window).off('.ArticleIndex');
  },

  connect: function(element, event, fn) {
    var _this = this;
    $(element).on(event, function(event) {
      fn.call(_this, event, this);
    });
  },

  selectedArticleIds: function() {
    return this.$articles.find('.selected').map(function() {
      return $(this).data('id');
    });
  },

  onScroll: function() {
    var isButtom = $(window).scrollTop() + 200 >= $(document).height() - $(window).height();
    var _this = this;

    if (isButtom && !_this.fetching && !_this.$articles.data('is-end')) {
      _this.fetching = true;

      $('#articles-spinner').show();

      $.ajax({
        url: _this.$articles.data('url'),
        data: { skip: _this.$articles.data('skip') },
        dataType: 'script',
        complete: function() {
          _this.fetching = false;
        }
      });
    }
  },

  editArticle: function(event, element) {
    event.preventDefault();
    event.stopPropagation();
    window.open($(element).attr('href'), '_blank');
  },

  createCategory: function(event) {
    event.preventDefault();
    var _this = this;

    $.ajax({
      url: '/categories',
      data: this.$newCategoryForm.serializeArray(),
      type: 'post',
      dataType: 'json'
    }).success(function(data) {
      if (_this.$moveCategoryForm.is(':visible')) {
        var $li = $('<li><a href="#">');
        $li.find('a').text(data.name).data('category-id', data.urlname);
        _this.$moveCategoryForm.find('.dropdown-menu').prepend($li);
        _this.$moveCategoryForm.find('.dropdown-toggle').text(data.name);
        _this.$moveCategoryForm.find('[name*=category_id]').val(data.urlname);
        Dialog.hide('#new-category-modal');
      } else {
        Turbolinks.visit('/categories/' + data.urlname);
      }
    });
  },

  selectMoveCategory: function(event, element) {
    event.preventDefault();
    var $item = $(element);
    $item.closest('.dropdown').find('.dropdown-toggle').text($item.text());
    this.$moveCategoryForm.find('[name*=category_id]').val($item.data('category-id'));
  },

  updateBulkbar: function() {
    var $selected = $('#articles .article.selected');
    var count = $selected.length;
    this.$bulkbar.find('.selected-count').text(count);
    if (count) {
      this.$bulkbar.removeClass('bulkbar-hide');
    } else {
      this.$bulkbar.addClass('bulkbar-hide');
    }

    if (count > 1) {
      this.$bulkbar.find('.view-button, .edit-button').addClass('button-disabled');
      this.$bulkbar.find('.publish-button, .draft-button').removeClass('button-disabled');
    } else {
      if ($selected.data('status') === 'publish') {
        this.$bulkbar.find('.view-button, .draft-button').removeClass('button-disabled');
        this.$bulkbar.find('.publish-button').addClass('button-disabled');
      } else if ($selected.data('status') === 'draft') {
        this.$bulkbar.find('.view-button, .draft-button').addClass('button-disabled');
        this.$bulkbar.find('.publish-button').removeClass('button-disabled');
      } else { // trash
        this.$bulkbar.find('.view-button').addClass('button-disabled');
        this.$bulkbar.find('.publish-button, .draft-button').removeClass('button-disabled');
      }
      this.$bulkbar.find('.edit-button').removeClass('button-disabled');
    }
  },

  bulkSelect: function(event, element) {
    event.preventDefault();
    document.getSelection().removeAllRanges();

    var $element = $(element);

    if (event.ctrlKey ||
        event.keyCode === 224 || // Command in Firefox
        event.keyCode === 17 ||  //            Opera
        event.keyCode === 91 ||  //            Webkit(Left Apple)
        event.keyCode === 93) {  //            Webkit(Right Apple)
      this.$articles.find('.last-shift-clicked').removeClass('last-shift-clicked');
      this.$articles.find('.last-clicked').removeClass('last-clicked');
      $element.toggleClass('selected').addClass('last-clicked');
    } else if (event.shiftKey) {
      var $lastClicked = this.$articles.find('.last-clicked');
      var $lastShiftClicked = this.$articles.find('.last-shift-clicked');

      // clear prev
      if ($lastClicked.prevAll('.last-shift-clicked').length) {
        $lastClicked.prevUntil('.last-shift-clicked').removeClass('selected');
      } else if ($lastClicked.nextAll('.last-shift-clicked').length) {
        $lastClicked.nextUntil('.last-shift-clicked').removeClass('selected');
      }

      $lastShiftClicked.removeClass('last-shift-clicked selected');
      $element.addClass('last-shift-clicked selected');
      // select range

      if ($lastClicked.prevAll('.last-shift-clicked').length) {
        $lastClicked.prevUntil('.last-shift-clicked').andSelf().addClass('selected');
      } else if ($lastClicked.nextAll('.last-shift-clicked').length) {
        $lastClicked.nextUntil('.last-shift-clicked').andSelf().addClass('selected');
      }

    } else {
      this.$articles.find('.article.selected').not($element).removeClass('selected');
      this.$articles.find('.last-clicked').removeClass('last-clicked');
      this.$articles.find('.last-shift-clicked').removeClass('last-shift-clicked');
      $element.toggleClass('selected');
      $element.addClass('last-clicked');
    }
    this.updateBulkbar();
  },

  bulkCancel: function(event) {
    event.preventDefault();
    this.$articles.find('.article.selected').removeClass('selected');
    this.$bulkbar.addClass('bulkbar-hide').find('.selected-count').text(0);
    $('#topbar').removeClass('no-shadow');
  },

  view: function(event) {
    event.preventDefault();

    var $article = this.$articles.find('.article.selected');
    if ($article.length === 1 && $article.data('status') === 'publish') {
      window.open($article.data('link'), '_blank');
    }
  },

  edit: function(event) {
    event.preventDefault();

    var $article = this.$articles.find('.article.selected');
    if ($article.length === 1) {
      window.open(this.$articles.find('.article.selected .title a').attr('href'), '_blank');
    }
  },

  bulkPublish: function(event) {
    event.preventDefault();
    var _this = this;

    AlertMessage.loading('Loading...');

    $.ajax({
      url: '/articles/bulk',
      data: {
        type: 'publish',
        ids: this.selectedArticleIds().get()
      },
      dataType: 'json',
      type: 'post'
    }).success(function(data) {
      AlertMessage.success('Done', 1500);
      var moveOut = (_this.$articles.data('status') && _this.$articles.data('status') !== 'publish');
      $.each(data, function() {
        var $article = _this.$articles.find('.article[data-id=' + this.token + ']');
        if (moveOut) {
          $article.remove();
        } else {
          $article.addClass('publish').removeClass('trash draft');
          $article.data('status', 'publish');
        }
      });

      if (moveOut) {
        var skip = _this.$articles.data('skip');
        _this.$articles.data('skip', skip - data.length);
        _this.emptyMessage();
      }

      _this.updateBulkbar();
    });
  },

  bulkDraft: function(event) {
    event.preventDefault();
    var _this = this;

    AlertMessage.loading('Loadin...');

    $.ajax({
      url: '/articles/bulk',
      data: {
        type: 'draft',
        ids: this.selectedArticleIds().get()
      },
      dataType: 'json',
      type: 'post'
    }).success(function(data) {
      AlertMessage.success('Done', 1500);
      var moveOut = (_this.$articles.data('status') && _this.$articles.data('status') !== 'draft');
      $.each(data, function() {
        var $article = _this.$articles.find('.article[data-id=' + this.token + ']');
        if (moveOut) {
          $article.remove();
        } else {
          $article.addClass('draft').removeClass('trash publish');
          $article.data('status', 'draft');
        }
      });

      if (moveOut) {
        var skip = _this.$articles.data('skip');
        _this.$articles.data('skip', skip - data.length);
        _this.emptyMessage();
      }

      _this.updateBulkbar();
    });
  },

  emptyMessage: function() {
    if (!this.$articles.find('.article').length) {
      $('#empty-message').show();
    }
  },

  bulkTrash: function(event) {
    event.preventDefault();
    var _this = this;

    AlertMessage.loading('Loading...');

    $.ajax({
      url: '/articles/bulk',
      data: {
        type: 'trash',
        ids: this.selectedArticleIds().get()
      },
      dataType: 'json',
      type: 'post'
    }).success(function(data) {
      AlertMessage.success('Done', 1500);
      var count = _this.$articles.find('.article.selected').length;
      var skip = _this.$articles.data('skip');
      _this.$articles.data('skip', skip - count);
      _this.$articles.find('.article.selected').remove();
      _this.updateBulkbar();
    });
  },

  bulkDelete: function(event) {
    event.preventDefault();
    var _this = this;

    $.ajax({
      url: '/articles/bulk',
      data: {
        type: 'delete',
        ids: this.selectedArticleIds().get()
      },
      dataType: 'json',
      type: 'post'
    }).success(function(data) {
      var count = _this.$articles.find('.article.selected').length;
      var skip = _this.$articles.data('skip');
      _this.$articles.data('skip', skip - count);
      _this.$articles.find('.article.selected').remove();

      Dialog.hide('#delete-modal');
      _this.updateBulkbar();
    });
  },

  emptyTrash: function(event) {
    event.preventDefault();
    var _this = this;
    var data;

    if (this.$articles.data('category-id')) {
      data = { category_id: this.$articles.data('category-id') };
    } else if (this.$articles.data('not-collected')) {
      data = { not_collected: true };
    } else {
      data = null;
    }

    $.ajax({
      url: '/trash',
      data: data,
      dataType: 'json',
      type: 'delete'
    }).success(function(data) {
      _this.$articles.data('skip', 0);
      _this.$articles.find('.article').remove();

      Dialog.hide('#empty-trash-modal');
      _this.updateBulkbar();
    });
  },

  bulkMove: function(event) {
    event.preventDefault();
    var _this = this;

    $.ajax({
      url: '/articles/bulk',
      data: {
        type: 'move',
        ids: this.selectedArticleIds().get(),
        category_id: this.$moveCategoryForm.find('[name*=category_id]').val()
      },
      dataType: 'json',
      type: 'post'
    }).success(function(data) {
      var moveOut = !$('#articles-index').length; // except all article page
      $.each(data, function() {
        var $article = _this.$articles.find('.article[data-id=' + this.token + ']');
        if (moveOut) {
          $article.remove();
        } else {
          if (this.category_name) {
            $article.find('.category').html($('<span class="category_name">').text(this.category_name));
          } else {
            $article.find('.category').html('');
          }
        }
      });

      if (moveOut) {
        var skip = _this.$articles.data('skip');
        _this.$articles.data('skip', skip - data.length);
        _this.updateBulkbar();
        _this.emptyMessage();
      }

      Dialog.hide('#move-category-modal');
    });
  }
};

var count = 0;

page_ready(function() {
  if ($('#articles-index, #articles-category, #articles-not_collected').length) {
    window.articleIndex = new ArticleIndex();

    $(document).one('page:change', function() {
      window.articleIndex.destroy();
      delete window.articleIndex;
    });
  }
});
