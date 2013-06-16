class BaseImporter
  def initialize(space, file)
    @space = space
    @file = file

    FileUtils.mkdir_p tmp_path
  end

  def tmp_path
    "#{Rails.root}/tmp/importers/#{self.class.name}/#{@space.id}"
  end

  def clean
    FileUtils.rm_r tmp_path
  end
end
