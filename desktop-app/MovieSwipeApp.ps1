param([switch]$ValidateOnly, [switch]$TestLibrary, [switch]$TestStats)

$ErrorActionPreference = "Stop"
$Script:AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:MovieFile = Join-Path $Script:AppDir "movies.json"
$Script:CustomMovieFile = Join-Path $Script:AppDir "custom-movies.json"
$Script:StatusFile = Join-Path $Script:AppDir "movie-status.json"
$Script:ReviewFile = Join-Path $Script:AppDir "movie-reviews.json"
$Script:ListsFile = Join-Path $Script:AppDir "movie-lists.json"
$Script:DailyFile = Join-Path $Script:AppDir "daily-recommendations.json"
$Script:SettingsFile = Join-Path $Script:AppDir "movie-settings.json"
$Script:ErrorLogFile = Join-Path $Script:AppDir "app-error.log"

function Read-JsonFile($Path, $Fallback) {
  if (-not (Test-Path $Path)) {
    return $Fallback
  }
  try {
    return Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    return $Fallback
  }
}

function Save-JsonFile($Path, $Value) {
  $Value | ConvertTo-Json -Depth 8 | Set-Content $Path -Encoding UTF8
}

function Write-AppError($Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Message"
  Add-Content -Path $Script:ErrorLogFile -Value $line -Encoding UTF8
}

function As-Array($Value) {
  if ($null -eq $Value) {
    return @()
  }
  if ($Value -is [array]) {
    return @($Value)
  }
  return @($Value)
}

function Expand-JsonArray($Value) {
  if ($null -eq $Value) {
    return @()
  }
  if ($Value -is [array]) {
    return @($Value)
  }
  return @($Value | ForEach-Object { $_ })
}

$baseMoviesRaw = Read-JsonFile $Script:MovieFile @()
$customMoviesRaw = Read-JsonFile $Script:CustomMovieFile @()
$Script:BaseMovies = @(Expand-JsonArray $baseMoviesRaw)
$Script:CustomMovies = @(Expand-JsonArray $customMoviesRaw)
$Script:Movies = @($Script:BaseMovies + $Script:CustomMovies)
$loadedReviews = Read-JsonFile $Script:ReviewFile ([pscustomobject]@{})
$Script:Reviews = @{}
if ($null -ne $loadedReviews) {
  foreach ($property in $loadedReviews.PSObject.Properties) {
    $Script:Reviews[$property.Name] = [ordered]@{
      personalRating = $property.Value.personalRating
      review = [string]$property.Value.review
      watchDate = [string]$property.Value.watchDate
      platform = [string]$property.Value.platform
      rewatch = [bool]$property.Value.rewatch
      privateTags = [string]$property.Value.privateTags
      customLists = [string]$property.Value.customLists
    }
  }
}
$loadedLists = Read-JsonFile $Script:ListsFile ([pscustomobject]@{})
$Script:Lists = @{}
if ($null -ne $loadedLists) {
  foreach ($property in $loadedLists.PSObject.Properties) {
    $Script:Lists[$property.Name] = @(As-Array $property.Value)
  }
}
$loadedStatus = Read-JsonFile $Script:StatusFile ([pscustomobject]@{
  watched = @()
  wantToWatch = @()
  skipped = @()
})
$Script:Status = [ordered]@{
  watched = @(As-Array $loadedStatus.watched)
  wantToWatch = @(As-Array $loadedStatus.wantToWatch)
  skipped = @(As-Array $loadedStatus.skipped)
}
$loadedSettings = Read-JsonFile $Script:SettingsFile ([pscustomobject]@{
  allowRepeatRecommendations = $false
  onlyHighRated = $false
  tmdbApiKey = ""
  tmdbBearerToken = ""
  omdbApiKey = ""
  traktClientId = ""
  watchmodeApiKey = ""
})
$Script:Settings = [ordered]@{
  allowRepeatRecommendations = [bool]$loadedSettings.allowRepeatRecommendations
  onlyHighRated = [bool]$loadedSettings.onlyHighRated
  tmdbApiKey = [string]$loadedSettings.tmdbApiKey
  tmdbBearerToken = [string]$loadedSettings.tmdbBearerToken
  omdbApiKey = [string]$loadedSettings.omdbApiKey
  traktClientId = [string]$loadedSettings.traktClientId
  watchmodeApiKey = [string]$loadedSettings.watchmodeApiKey
}
$Script:Filters = [ordered]@{
  type = "全部"
  genre = "全部"
  yearRange = "全部"
  minRating = "不限"
}

if ($ValidateOnly) {
  "OK: loaded $($Script:Movies.Count) movies."
  exit 0
}

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$Script:CurrentMovie = $null
$Script:ActiveLibraryTab = "watched"
$Script:UndoStack = [System.Collections.ArrayList]::new()
$Script:ActiveCustomListFilter = "全部"

function New-Brush($Hex) {
  return [Windows.Media.BrushConverter]::new().ConvertFromString($Hex)
}

function New-GradientBrush($StartHex, $EndHex, $Angle = 135) {
  $brush = [Windows.Media.LinearGradientBrush]::new()
  $brush.StartPoint = [Windows.Point]::new(0, 0)
  $brush.EndPoint = [Windows.Point]::new(1, 1)
  [void]$brush.GradientStops.Add([Windows.Media.GradientStop]::new((New-Brush $StartHex).Color, 0))
  [void]$brush.GradientStops.Add([Windows.Media.GradientStop]::new((New-Brush $EndHex).Color, 1))
  return $brush
}

function New-Orb($Width, $Height, $Color, $Left, $Top, $Opacity = 0.72) {
  $orb = [Windows.Shapes.Ellipse]::new()
  $orb.Width = $Width
  $orb.Height = $Height
  $orb.Fill = New-Brush $Color
  $orb.Opacity = $Opacity
  $orb.Effect = [Windows.Media.Effects.BlurEffect]@{ Radius = 38 }
  [Windows.Controls.Canvas]::SetLeft($orb, $Left)
  [Windows.Controls.Canvas]::SetTop($orb, $Top)
  return $orb
}

function Apply-GlassBorder($Border, $Radius = 28) {
  $Border.CornerRadius = "$Radius"
  $Border.Background = New-GradientBrush "#55FFFFFF" "#18FFFFFF"
  $Border.BorderBrush = New-Brush "#77FFFFFF"
  $Border.BorderThickness = "1"
  $Border.Effect = [Windows.Media.Effects.DropShadowEffect]@{
    Color = [Windows.Media.Color]::FromRgb(0, 0, 0)
    Direction = 270
    ShadowDepth = 16
    BlurRadius = 42
    Opacity = 0.28
  }
}

function Apply-InputStyle($Control) {
  $Control.Background = New-Brush "#22FFFFFF"
  $Control.Foreground = New-Brush "#FFFFFF"
  $Control.BorderBrush = New-Brush "#66FFFFFF"
}

function New-Text($Text, $Size = 14, $Weight = "Normal", $Color = "#E5E7EB") {
  $control = [Windows.Controls.TextBlock]::new()
  $control.Text = $Text
  $control.FontSize = $Size
  $control.FontWeight = $Weight
  $control.Foreground = New-Brush $Color
  $control.TextWrapping = "Wrap"
  return $control
}

function New-Button($Text, $Background, $Foreground = "#FFFFFF") {
  $button = [Windows.Controls.Button]::new()
  $button.Content = $Text
  $button.Height = 42
  $button.Margin = "0,4,0,4"
  $button.Padding = "14,8,14,8"
  $button.Background = New-Brush $Background
  $button.Foreground = New-Brush $Foreground
  $button.BorderBrush = New-Brush "#66FFFFFF"
  $button.FontWeight = "SemiBold"
  $button.Effect = [Windows.Media.Effects.DropShadowEffect]@{
    Color = [Windows.Media.Color]::FromRgb(0, 0, 0)
    Direction = 270
    ShadowDepth = 7
    BlurRadius = 18
    Opacity = 0.18
  }
  return $button
}

function New-Combo($Items, $Selected) {
  $combo = [Windows.Controls.ComboBox]::new()
  $combo.Height = 36
  $combo.Margin = "0,4,0,12"
  Apply-InputStyle $combo
  foreach ($item in $Items) {
    [void]$combo.Items.Add($item)
  }
  $combo.SelectedItem = $Selected
  return $combo
}

function Save-Status {
  Save-JsonFile $Script:StatusFile ([pscustomobject]$Script:Status)
}

function Save-Settings {
  Save-JsonFile $Script:SettingsFile ([pscustomobject]$Script:Settings)
}

function Save-Reviews {
  Save-JsonFile $Script:ReviewFile ([pscustomobject]$Script:Reviews)
}

function Save-CustomMovies {
  Save-JsonFile $Script:CustomMovieFile $Script:CustomMovies
}

function Save-Lists {
  Save-JsonFile $Script:ListsFile ([pscustomobject]$Script:Lists)
}

function Push-Undo($Reason = "change") {
  $snapshot = [ordered]@{
    reason = $Reason
    status = [ordered]@{
      watched = @($Script:Status.watched)
      wantToWatch = @($Script:Status.wantToWatch)
      skipped = @($Script:Status.skipped)
    }
    customMovies = @($Script:CustomMovies)
    reviews = [ordered]@{}
    lists = [ordered]@{}
  }
  foreach ($key in $Script:Reviews.Keys) {
    $snapshot.reviews[$key] = $Script:Reviews[$key]
  }
  foreach ($key in $Script:Lists.Keys) {
    $snapshot.lists[$key] = @($Script:Lists[$key])
  }
  [void]$Script:UndoStack.Add($snapshot)
  while ($Script:UndoStack.Count -gt 20) {
    $Script:UndoStack.RemoveAt(0)
  }
}

function Restore-Snapshot($Snapshot) {
  if ($null -eq $Snapshot) { return }
  $Script:Status = [ordered]@{
    watched = @($Snapshot.status.watched)
    wantToWatch = @($Snapshot.status.wantToWatch)
    skipped = @($Snapshot.status.skipped)
  }
  $Script:CustomMovies = @($Snapshot.customMovies)
  $Script:Movies = @($Script:BaseMovies + $Script:CustomMovies)
  $Script:Reviews = @{}
  foreach ($property in $Snapshot.reviews.Keys) {
    $Script:Reviews[$property] = $Snapshot.reviews[$property]
  }
  $Script:Lists = @{}
  foreach ($property in $Snapshot.lists.Keys) {
    $Script:Lists[$property] = @($Snapshot.lists[$property])
  }
  Save-Status
  Save-CustomMovies
  Save-Reviews
  Save-Lists
}

function Undo-LastAction {
  if ($Script:UndoStack.Count -eq 0) {
    [Windows.MessageBox]::Show("没有可撤销的操作。", "刷片夹")
    return
  }
  $snapshot = $Script:UndoStack[$Script:UndoStack.Count - 1]
  $Script:UndoStack.RemoveAt($Script:UndoStack.Count - 1)
  Restore-Snapshot $snapshot
  Refresh-Stats
  Refresh-Library
  Next-Movie
}

function Get-MovieById($MovieId) {
  return @($Script:Movies | Where-Object { $_.id -eq $MovieId } | Select-Object -First 1)[0]
}

function Get-AllAppData {
  return [ordered]@{
    exportedAt = (Get-Date).ToString("s")
    status = [ordered]@{
      watched = @($Script:Status.watched)
      wantToWatch = @($Script:Status.wantToWatch)
      skipped = @($Script:Status.skipped)
    }
    reviews = [pscustomobject]$Script:Reviews
    customMovies = @($Script:CustomMovies)
    customLists = [pscustomobject]$Script:Lists
    settings = [pscustomobject]$Script:Settings
  }
}

function Export-AllJson {
  $target = Join-Path $Script:AppDir "movie-swipe-full-export.json"
  Save-JsonFile $target (Get-AllAppData)
  [Windows.MessageBox]::Show("已导出完整数据到 $target", "刷片夹")
}

function Export-WatchedCsv {
  $target = Join-Path $Script:AppDir "movie-watched-export.csv"
  $rows = foreach ($id in @($Script:Status.watched)) {
    $movie = Get-MovieById $id
    if ($null -eq $movie) { continue }
    $review = Get-MovieReview $id
    [pscustomobject]@{
      标题 = $movie.title
      原名 = $movie.originalTitle
      年份 = $movie.year
      类型 = if ($movie.type -eq "tv") { "电视剧" } else { "电影" }
      官方评分 = $movie.rating
      我的评分 = if ($null -ne $review) { $review.personalRating } else { "" }
      观看日期 = if ($null -ne $review) { $review.watchDate } else { "" }
      平台 = if ($null -ne $review) { $review.platform } else { "" }
      标签 = if ($null -ne $review) { $review.privateTags } else { "" }
      自定义片单 = if ($null -ne $review) { $review.customLists } else { "" }
      影评 = if ($null -ne $review) { $review.review } else { "" }
    }
  }
  $rows | Export-Csv -Path $target -NoTypeInformation -Encoding UTF8
  [Windows.MessageBox]::Show("已导出 CSV 到 $target", "刷片夹")
}

function Backup-AppData {
  $target = Join-Path $Script:AppDir ("backup-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
  Save-JsonFile $target (Get-AllAppData)
  [Windows.MessageBox]::Show("已备份到 $target", "刷片夹")
}

function Restore-AppDataFromFile {
  $dialog = [Microsoft.Win32.OpenFileDialog]::new()
  $dialog.Title = "选择刷片夹备份 JSON"
  $dialog.Filter = "JSON 文件 (*.json)|*.json|所有文件 (*.*)|*.*"
  if ($dialog.ShowDialog() -ne $true) { return }
  try {
    Push-Undo "restore"
    $data = Read-JsonFile $dialog.FileName $null
    if ($null -eq $data) { throw "备份文件无效。" }
    if ($null -ne $data.status) {
      $Script:Status = [ordered]@{
        watched = @(As-Array $data.status.watched)
        wantToWatch = @(As-Array $data.status.wantToWatch)
        skipped = @(As-Array $data.status.skipped)
      }
      Save-Status
    }
    if ($null -ne $data.customMovies) {
      $Script:CustomMovies = @(Expand-JsonArray $data.customMovies)
      $Script:Movies = @($Script:BaseMovies + $Script:CustomMovies)
      Save-CustomMovies
    }
    if ($null -ne $data.reviews) {
      $Script:Reviews = @{}
      foreach ($property in $data.reviews.PSObject.Properties) {
        $Script:Reviews[$property.Name] = $property.Value
      }
      Save-Reviews
    }
    if ($null -ne $data.customLists) {
      $Script:Lists = @{}
      foreach ($property in $data.customLists.PSObject.Properties) {
        $Script:Lists[$property.Name] = @(As-Array $property.Value)
      }
      Save-Lists
    }
    Refresh-Stats
    Refresh-Library
    Next-Movie
    [Windows.MessageBox]::Show("恢复完成。", "刷片夹")
  } catch {
    Write-AppError $_.Exception.ToString()
    [Windows.MessageBox]::Show("恢复失败，错误已写入 app-error.log。", "刷片夹")
  }
}

function Import-TitleListAsWatched {
  $dialog = [Microsoft.Win32.OpenFileDialog]::new()
  $dialog.Title = "选择标题列表 TXT/CSV"
  $dialog.Filter = "文本或 CSV (*.txt;*.csv)|*.txt;*.csv|所有文件 (*.*)|*.*"
  if ($dialog.ShowDialog() -ne $true) { return }
  try {
    Push-Undo "import-title-list"
    $lines = @(Get-Content $dialog.FileName -Encoding UTF8 | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $added = 0
    foreach ($line in $lines) {
      $title = ([string]$line).Trim()
      if ($title.Contains(",")) {
        $title = ($title -split ",")[0].Trim('" ')
      }
      if ([string]::IsNullOrWhiteSpace($title) -or $title -match "^(title|标题|电影名)$") { continue }
      $exists = @($Script:Movies | Where-Object { $_.title -eq $title -or $_.originalTitle -eq $title }).Count -gt 0
      if ($exists) {
        $movie = @($Script:Movies | Where-Object { $_.title -eq $title -or $_.originalTitle -eq $title } | Select-Object -First 1)[0]
        foreach ($name in @("watched", "wantToWatch", "skipped")) {
          $Script:Status[$name] = @($Script:Status[$name] | Where-Object { $_ -ne $movie.id })
        }
        $Script:Status.watched = @($movie.id) + @($Script:Status.watched)
      } else {
        $movie = [pscustomobject]@{
          id = "custom-$([Guid]::NewGuid().ToString('N'))"
          title = $title
          originalTitle = ""
          year = 0
          type = "movie"
          rating = 0
          popularity = 1
          genres = @("导入")
          posterUrl = ""
          description = "批量导入的看过作品。"
        }
        $Script:CustomMovies = @($movie) + @($Script:CustomMovies)
        $Script:Status.watched = @($movie.id) + @($Script:Status.watched)
      }
      $added++
    }
    $Script:Movies = @($Script:BaseMovies + $Script:CustomMovies)
    Save-CustomMovies
    Save-Status
    Refresh-Stats
    Refresh-Library
    [Windows.MessageBox]::Show("已导入 $added 条标题。", "刷片夹")
  } catch {
    Write-AppError $_.Exception.ToString()
    [Windows.MessageBox]::Show("导入失败，错误已写入 app-error.log。", "刷片夹")
  }
}

function Get-MovieReview($MovieId) {
  if ($Script:Reviews.ContainsKey($MovieId)) {
    return $Script:Reviews[$MovieId]
  }
  return $null
}

function Show-ReviewDialog($Movie) {
  $movieId = [string]$Movie.id
  $current = Get-MovieReview $movieId
  $dialog = [Windows.Window]::new()
  $dialog.Title = "评分与影评 - $($Movie.title)"
  $dialog.Width = 440
  $dialog.Height = 560
  $dialog.WindowStartupLocation = "CenterOwner"
  $dialog.Background = New-Brush "#0F172A"
  $dialog.Foreground = New-Brush "#E5E7EB"
  $dialog.Owner = $window

  $panel = [Windows.Controls.StackPanel]::new()
  $panel.Margin = "18"
  [void]$panel.Children.Add((New-Text $Movie.title 22 "Bold" "#FFFFFF"))
  [void]$panel.Children.Add((New-Text "个人评分（0-10，可留空）" 13 "Normal" "#94A3B8"))
  $ratingBox = [Windows.Controls.TextBox]::new()
  Apply-InputStyle $ratingBox
  $ratingBox.Height = 34
  $ratingBox.Margin = "0,6,0,12"
  if ($null -ne $current -and $null -ne $current.personalRating) {
    $ratingBox.Text = [string]$current.personalRating
  }
  [void]$panel.Children.Add($ratingBox)
  [void]$panel.Children.Add((New-Text "影评 / 备注" 13 "Normal" "#94A3B8"))
  $reviewBox = [Windows.Controls.TextBox]::new()
  Apply-InputStyle $reviewBox
  $reviewBox.AcceptsReturn = $true
  $reviewBox.TextWrapping = "Wrap"
  $reviewBox.Height = 132
  $reviewBox.Margin = "0,6,0,14"
  if ($null -ne $current) {
    $reviewBox.Text = [string]$current.review
  }
  [void]$panel.Children.Add($reviewBox)

  $metaGrid = [Windows.Controls.Grid]::new()
  for ($i = 0; $i -lt 2; $i++) { $metaGrid.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new()) }
  $leftMeta = [Windows.Controls.StackPanel]::new()
  $rightMeta = [Windows.Controls.StackPanel]::new()
  [void]$leftMeta.Children.Add((New-Text "观看日期" 12 "Normal" "#94A3B8"))
  $watchDateBox = [Windows.Controls.TextBox]::new()
  Apply-InputStyle $watchDateBox
  $watchDateBox.Height = 30
  $watchDateBox.Margin = "0,4,8,8"
  $watchDateBox.Text = if ($null -ne $current -and -not [string]::IsNullOrWhiteSpace([string]$current.watchDate)) { [string]$current.watchDate } else { (Get-Date).ToString("yyyy-MM-dd") }
  [void]$leftMeta.Children.Add($watchDateBox)
  [void]$leftMeta.Children.Add((New-Text "私人标签" 12 "Normal" "#94A3B8"))
  $tagBox = [Windows.Controls.TextBox]::new()
  Apply-InputStyle $tagBox
  $tagBox.Height = 30
  $tagBox.Margin = "0,4,8,8"
  if ($null -ne $current) { $tagBox.Text = [string]$current.privateTags }
  [void]$leftMeta.Children.Add($tagBox)
  [void]$rightMeta.Children.Add((New-Text "观看平台" 12 "Normal" "#94A3B8"))
  $platformBox = [Windows.Controls.TextBox]::new()
  Apply-InputStyle $platformBox
  $platformBox.Height = 30
  $platformBox.Margin = "8,4,0,8"
  if ($null -ne $current) { $platformBox.Text = [string]$current.platform }
  [void]$rightMeta.Children.Add($platformBox)
  [void]$rightMeta.Children.Add((New-Text "自定义片单（逗号分隔）" 12 "Normal" "#94A3B8"))
  $listBox = [Windows.Controls.TextBox]::new()
  Apply-InputStyle $listBox
  $listBox.Height = 30
  $listBox.Margin = "8,4,0,8"
  if ($null -ne $current) { $listBox.Text = [string]$current.customLists }
  [void]$rightMeta.Children.Add($listBox)
  $rewatchCheck = [Windows.Controls.CheckBox]::new()
  $rewatchCheck.Content = "二刷 / 重看"
  $rewatchCheck.Foreground = New-Brush "#E5E7EB"
  $rewatchCheck.Margin = "8,0,0,8"
  if ($null -ne $current) { $rewatchCheck.IsChecked = [bool]$current.rewatch }
  [void]$rightMeta.Children.Add($rewatchCheck)
  [Windows.Controls.Grid]::SetColumn($leftMeta, 0)
  [Windows.Controls.Grid]::SetColumn($rightMeta, 1)
  [void]$metaGrid.Children.Add($leftMeta)
  [void]$metaGrid.Children.Add($rightMeta)
  [void]$panel.Children.Add($metaGrid)

  $buttons = [Windows.Controls.StackPanel]::new()
  $buttons.Orientation = "Horizontal"
  $save = New-Button "保存" "#34D399" "#06110D"
  $save.Width = 110
  $cancel = New-Button "取消" "#334155"
  $cancel.Width = 110
  $cancel.Margin = "10,4,0,4"
  $save.Add_Click({
    $value = $null
    if (-not [string]::IsNullOrWhiteSpace($ratingBox.Text)) {
      try {
        $value = [Math]::Min(10, [Math]::Max(0, [double]$ratingBox.Text))
      } catch {
        [Windows.MessageBox]::Show("评分请输入 0 到 10 之间的数字。", "刷片夹")
        return
      }
    }
    Push-Undo "review"
    $Script:Reviews[$movieId] = [ordered]@{
      personalRating = $value
      review = $reviewBox.Text
      watchDate = $watchDateBox.Text
      platform = $platformBox.Text
      rewatch = [bool]$rewatchCheck.IsChecked
      privateTags = $tagBox.Text
      customLists = $listBox.Text
    }
    foreach ($existingList in @($Script:Lists.Keys)) {
      $Script:Lists[$existingList] = @($Script:Lists[$existingList] | Where-Object { $_ -ne $movieId })
    }
    foreach ($listNameRaw in @($listBox.Text -split "[,，]")) {
      $listName = $listNameRaw.Trim()
      if ([string]::IsNullOrWhiteSpace($listName)) { continue }
      if (-not $Script:Lists.ContainsKey($listName)) { $Script:Lists[$listName] = @() }
      if (-not @($Script:Lists[$listName]).Contains($movieId)) {
        $Script:Lists[$listName] = @($movieId) + @($Script:Lists[$listName])
      }
    }
    foreach ($existingList in @($Script:Lists.Keys)) {
      if (@($Script:Lists[$existingList]).Count -eq 0) {
        $Script:Lists.Remove($existingList)
      }
    }
    Save-Reviews
    Save-Lists
    Refresh-CustomListCombo
    $dialog.DialogResult = $true
    $dialog.Close()
    Refresh-Library
  })
  $cancel.Add_Click({ $dialog.Close() })
  [void]$buttons.Children.Add($save)
  [void]$buttons.Children.Add($cancel)
  [void]$panel.Children.Add($buttons)
  $dialog.Content = $panel
  [void]$dialog.ShowDialog()
}

function Show-MovieDetailDialog($Movie) {
  if ($null -eq $Movie) { return }
  $movieId = [string]$Movie.id
  $review = Get-MovieReview $movieId
  $dialog = [Windows.Window]::new()
  $dialog.Title = "作品详情 - $($Movie.title)"
  $dialog.Width = 780
  $dialog.Height = 560
  $dialog.WindowStartupLocation = "CenterOwner"
  $dialog.Owner = $window
  $dialog.Background = New-GradientBrush "#09111F" "#21163E"

  $outer = [Windows.Controls.Border]::new()
  $outer.Margin = "18"
  $outer.Padding = "18"
  Apply-GlassBorder $outer 28
  $grid = [Windows.Controls.Grid]::new()
  $grid.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
  $grid.ColumnDefinitions[0].Width = "230"
  $grid.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())

  $poster = [Windows.Controls.Image]::new()
  $poster.Width = 210
  $poster.Height = 315
  $poster.Stretch = "UniformToFill"
  Set-Poster $poster $Movie.posterUrl
  [Windows.Controls.Grid]::SetColumn($poster, 0)
  [void]$grid.Children.Add($poster)

  $stack = [Windows.Controls.StackPanel]::new()
  $source = if ($null -ne $Movie.PSObject.Properties["source"] -and -not [string]::IsNullOrWhiteSpace([string]$Movie.source)) { [string]$Movie.source } else { "本地库" }
  [void]$stack.Children.Add((New-Text $Movie.title 30 "Bold" "#FFFFFF"))
  [void]$stack.Children.Add((New-Text "$($Movie.originalTitle) · $($Movie.year) · $source" 13 "Normal" "#BDF8FF"))
  [void]$stack.Children.Add((New-Text "类型：$(@(As-Array $Movie.genres) -join ' / ')" 13 "Normal" "#E5E7EB"))
  [void]$stack.Children.Add((New-Text "官方评分：$($Movie.rating)   热度：$($Movie.popularity)" 13 "SemiBold" "#FFD166"))
  [void]$stack.Children.Add((New-Text "简介" 16 "SemiBold" "#FFFFFF"))
  [void]$stack.Children.Add((New-Text ([string]$Movie.description) 14 "Normal" "#CBD5E1"))
  [void]$stack.Children.Add((New-Text "个人记录" 16 "SemiBold" "#FFFFFF"))
  if ($null -eq $review) {
    [void]$stack.Children.Add((New-Text "暂无个人评分、影评或观看记录。" 13 "Normal" "#94A3B8"))
  } else {
    [void]$stack.Children.Add((New-Text "我的评分：$($review.personalRating)   日期：$($review.watchDate)   平台：$($review.platform)" 13 "Normal" "#A7F3D0"))
    [void]$stack.Children.Add((New-Text "标签：$($review.privateTags)   片单：$($review.customLists)" 13 "Normal" "#CBD5E1"))
    [void]$stack.Children.Add((New-Text "影评：$($review.review)" 13 "Normal" "#E5E7EB"))
  }
  $buttonRow = [Windows.Controls.StackPanel]::new()
  $buttonRow.Orientation = "Horizontal"
  $edit = New-Button "编辑评分/影评" "#34D399" "#06110D"
  $edit.Width = 140
  $edit.Add_Click({ Show-ReviewDialog $Movie })
  $close = New-Button "关闭" "#334155"
  $close.Width = 92
  $close.Margin = "10,4,0,4"
  $close.Add_Click({ $dialog.Close() })
  [void]$buttonRow.Children.Add($edit)
  [void]$buttonRow.Children.Add($close)
  [void]$stack.Children.Add($buttonRow)

  [Windows.Controls.Grid]::SetColumn($stack, 1)
  [void]$grid.Children.Add($stack)
  $outer.Child = $grid
  $dialog.Content = $outer
  [void]$dialog.ShowDialog()
}

function Add-CustomWatchedMovie($Title) {
  if ([string]::IsNullOrWhiteSpace($Title)) {
    return
  }
  Push-Undo "add-custom"
  $movie = [pscustomobject]@{
    id = "custom-$([Guid]::NewGuid().ToString('N'))"
    title = $Title.Trim()
    originalTitle = ""
    year = [DateTime]::Now.Year
    type = "movie"
    rating = 0
    popularity = 1
    genres = @("自定义")
    posterUrl = ""
    description = "手动添加的看过作品。"
  }
  $Script:CustomMovies = @($movie) + @($Script:CustomMovies)
  $Script:Movies = @($Script:BaseMovies + $Script:CustomMovies)
  Save-CustomMovies
  foreach ($name in @("watched", "wantToWatch", "skipped")) {
    $Script:Status[$name] = @($Script:Status[$name] | Where-Object { $_ -ne $movie.id })
  }
  $Script:Status.watched = @($movie.id) + @($Script:Status.watched)
  Save-Status
  Refresh-Stats
  Refresh-Library
}

function Add-MovieObjectToCatalog($Movie) {
  if ($null -eq $Movie -or [string]::IsNullOrWhiteSpace([string]$Movie.id)) {
    return
  }
  Push-Undo "add-from-search"
  $exists = @($Script:Movies | Where-Object { $_.id -eq $Movie.id }).Count -gt 0
  if (-not $exists) {
    $Script:CustomMovies = @($Movie) + @($Script:CustomMovies)
    $Script:Movies = @($Script:BaseMovies + $Script:CustomMovies)
    Save-CustomMovies
  }
  foreach ($name in @("watched", "wantToWatch", "skipped")) {
    $Script:Status[$name] = @($Script:Status[$name] | Where-Object { $_ -ne $Movie.id })
  }
  $Script:Status.watched = @($Movie.id) + @($Script:Status.watched)
  Save-Status
  Refresh-Stats
  Refresh-Library
  Refresh-HomeAddResults
}

function Get-YearFromText($Value) {
  if ($null -eq $Value) {
    return 0
  }
  $match = [regex]::Match([string]$Value, "\d{4}")
  if ($match.Success) {
    return [int]$match.Value
  }
  return 0
}

function Get-TmdbGenreNames($Ids) {
  $map = @{
    "12" = "冒险"; "14" = "奇幻"; "16" = "动画"; "18" = "剧情"; "27" = "恐怖"; "28" = "动作";
    "35" = "喜剧"; "36" = "历史"; "37" = "西部"; "53" = "惊悚"; "80" = "犯罪"; "99" = "纪录";
    "878" = "科幻"; "9648" = "悬疑"; "10402" = "音乐"; "10749" = "爱情"; "10751" = "家庭";
    "10752" = "战争"; "10759" = "动作冒险"; "10762" = "儿童"; "10763" = "新闻"; "10764" = "真人秀";
    "10765" = "科幻奇幻"; "10766" = "肥皂剧"; "10767" = "脱口秀"; "10768" = "战争政治"; "10770" = "电视电影"
  }
  $names = @()
  foreach ($id in @(As-Array $Ids)) {
    $key = [string]$id
    if ($map.ContainsKey($key)) {
      $names += $map[$key]
    }
  }
  if ($names.Count -eq 0) {
    return @("TMDb")
  }
  return @($names | Select-Object -Unique)
}

function New-TmdbHeaders {
  $headers = @{}
  if (-not [string]::IsNullOrWhiteSpace($Script:Settings.tmdbBearerToken)) {
    $headers["Authorization"] = "Bearer $($Script:Settings.tmdbBearerToken.Trim())"
  }
  return $headers
}

function Search-Tmdb($Query) {
  if ([string]::IsNullOrWhiteSpace($Script:Settings.tmdbApiKey) -and [string]::IsNullOrWhiteSpace($Script:Settings.tmdbBearerToken)) {
    return @()
  }
  $encoded = [Uri]::EscapeDataString($Query)
  $authQuery = ""
  if ([string]::IsNullOrWhiteSpace($Script:Settings.tmdbBearerToken) -and -not [string]::IsNullOrWhiteSpace($Script:Settings.tmdbApiKey)) {
    $authQuery = "&api_key=$([Uri]::EscapeDataString($Script:Settings.tmdbApiKey.Trim()))"
  }
  $headers = New-TmdbHeaders
  $results = @()
  foreach ($spec in @(@("movie", "movie"), @("tv", "tv"))) {
    $endpoint = $spec[0]
    $appType = $spec[1]
    $url = "https://api.themoviedb.org/3/search/$endpoint?query=$encoded&include_adult=false&language=zh-CN&page=1$authQuery"
    try {
      $response = Invoke-RestMethod -Method Get -Uri $url -Headers $headers -TimeoutSec 12
      foreach ($item in @($response.results | Select-Object -First 5)) {
        $title = if ($appType -eq "movie") { [string]$item.title } else { [string]$item.name }
        if ([string]::IsNullOrWhiteSpace($title)) { continue }
        $original = if ($appType -eq "movie") { [string]$item.original_title } else { [string]$item.original_name }
        $dateText = if ($appType -eq "movie") { [string]$item.release_date } else { [string]$item.first_air_date }
        $poster = if ([string]::IsNullOrWhiteSpace([string]$item.poster_path)) { "" } else { "https://image.tmdb.org/t/p/w500$($item.poster_path)" }
        $popularity = [Math]::Min(10, [Math]::Round(([double]$item.popularity / 20), 1))
        $results += [pscustomobject]@{
          id = "tmdb-$appType-$($item.id)"
          title = $title
          originalTitle = $original
          year = Get-YearFromText $dateText
          type = $appType
          rating = [Math]::Round([double]$item.vote_average, 1)
          popularity = $popularity
          genres = @(Get-TmdbGenreNames $item.genre_ids)
          posterUrl = $poster
          description = if ([string]::IsNullOrWhiteSpace([string]$item.overview)) { "来自 TMDb 的在线搜索结果。" } else { [string]$item.overview }
          source = "TMDb"
        }
      }
    } catch {
      Write-AppError "TMDb search failed: $($_.Exception.Message)"
    }
  }
  return @($results)
}

function Search-Omdb($Query) {
  if ([string]::IsNullOrWhiteSpace($Script:Settings.omdbApiKey)) {
    return @()
  }
  $encoded = [Uri]::EscapeDataString($Query)
  $key = [Uri]::EscapeDataString($Script:Settings.omdbApiKey.Trim())
  $results = @()
  try {
    $searchUrl = "https://www.omdbapi.com/?apikey=$key&s=$encoded&page=1&r=json"
    $search = Invoke-RestMethod -Method Get -Uri $searchUrl -TimeoutSec 12
    foreach ($item in @($search.Search | Select-Object -First 6)) {
      $detail = $null
      try {
        $detailUrl = "https://www.omdbapi.com/?apikey=$key&i=$([Uri]::EscapeDataString([string]$item.imdbID))&plot=short&r=json"
        $detail = Invoke-RestMethod -Method Get -Uri $detailUrl -TimeoutSec 12
      } catch {
        Write-AppError "OMDb detail failed: $($_.Exception.Message)"
      }
      $rating = 0
      if ($null -ne $detail -and $detail.imdbRating -ne "N/A") {
        $rating = [Math]::Round([double]$detail.imdbRating, 1)
      }
      $genres = @("OMDb")
      if ($null -ne $detail -and -not [string]::IsNullOrWhiteSpace([string]$detail.Genre) -and $detail.Genre -ne "N/A") {
        $genres = @([string]$detail.Genre -split ",\s*" | Select-Object -First 4)
      }
      $plot = if ($null -ne $detail -and -not [string]::IsNullOrWhiteSpace([string]$detail.Plot) -and $detail.Plot -ne "N/A") { [string]$detail.Plot } else { "来自 OMDb / IMDb 的在线搜索结果。" }
      $ratingSource = ""
      if ($null -ne $detail -and $null -ne $detail.Ratings) {
        $ratingSource = (@($detail.Ratings | ForEach-Object { "$($_.Source): $($_.Value)" }) -join "；")
      }
      if (-not [string]::IsNullOrWhiteSpace($ratingSource)) {
        $plot = "$plot`n评分来源：$ratingSource"
      }
      $poster = if ($item.Poster -eq "N/A") { "" } else { [string]$item.Poster }
      $appType = if ($item.Type -eq "series") { "tv" } else { "movie" }
      $results += [pscustomobject]@{
        id = "omdb-$($item.imdbID)"
        title = [string]$item.Title
        originalTitle = [string]$item.Title
        year = Get-YearFromText $item.Year
        type = $appType
        rating = $rating
        popularity = 5
        genres = $genres
        posterUrl = $poster
        description = $plot
        source = "OMDb / IMDb"
      }
    }
  } catch {
    Write-AppError "OMDb search failed: $($_.Exception.Message)"
  }
  return @($results)
}

function Search-TvMaze($Query) {
  $encoded = [Uri]::EscapeDataString($Query)
  $results = @()
  try {
    $url = "https://api.tvmaze.com/search/shows?q=$encoded"
    $response = Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 12
    foreach ($entry in @($response | Select-Object -First 6)) {
      $show = $entry.show
      if ($null -eq $show -or [string]::IsNullOrWhiteSpace([string]$show.name)) { continue }
      $poster = ""
      if ($null -ne $show.image -and -not [string]::IsNullOrWhiteSpace([string]$show.image.medium)) {
        $poster = [string]$show.image.medium
      }
      $summary = if ([string]::IsNullOrWhiteSpace([string]$show.summary)) { "来自 TVMaze 的在线剧集搜索结果。" } else { ([string]$show.summary -replace "<[^>]+>", "") }
      $rating = 0
      if ($null -ne $show.rating -and $null -ne $show.rating.average) { $rating = [double]$show.rating.average }
      $results += [pscustomobject]@{
        id = "tvmaze-tv-$($show.id)"
        title = [string]$show.name
        originalTitle = [string]$show.name
        year = Get-YearFromText $show.premiered
        type = "tv"
        rating = $rating
        popularity = [Math]::Min(10, [Math]::Round([double]$entry.score * 10, 1))
        genres = if (@(As-Array $show.genres).Count -gt 0) { @(As-Array $show.genres) } else { @("TVMaze") }
        posterUrl = $poster
        description = $summary
        source = "TVMaze"
      }
    }
  } catch {
    Write-AppError "TVMaze search failed: $($_.Exception.Message)"
  }
  return @($results)
}

function Search-Trakt($Query) {
  if ([string]::IsNullOrWhiteSpace($Script:Settings.traktClientId)) { return @() }
  $encoded = [Uri]::EscapeDataString($Query)
  $results = @()
  try {
    $headers = @{
      "trakt-api-version" = "2"
      "trakt-api-key" = $Script:Settings.traktClientId.Trim()
    }
    $url = "https://api.trakt.tv/search/movie,show?query=$encoded"
    $response = Invoke-RestMethod -Method Get -Uri $url -Headers $headers -TimeoutSec 12
    foreach ($entry in @($response | Select-Object -First 8)) {
      $isShow = $null -ne $entry.show
      $item = if ($isShow) { $entry.show } else { $entry.movie }
      if ($null -eq $item) { continue }
      $results += [pscustomobject]@{
        id = "trakt-$([string]$entry.type)-$($item.ids.trakt)"
        title = [string]$item.title
        originalTitle = [string]$item.title
        year = [int]$item.year
        type = if ($isShow) { "tv" } else { "movie" }
        rating = 0
        popularity = [Math]::Min(10, [Math]::Round([double]$entry.score * 10, 1))
        genres = @("Trakt")
        posterUrl = ""
        description = "来自 Trakt 的在线搜索结果。IMDb: $($item.ids.imdb) / TMDb: $($item.ids.tmdb)"
        source = "Trakt"
      }
    }
  } catch {
    Write-AppError "Trakt search failed: $($_.Exception.Message)"
  }
  return @($results)
}

function Search-Watchmode($Query) {
  if ([string]::IsNullOrWhiteSpace($Script:Settings.watchmodeApiKey)) { return @() }
  $encoded = [Uri]::EscapeDataString($Query)
  $key = [Uri]::EscapeDataString($Script:Settings.watchmodeApiKey.Trim())
  $results = @()
  try {
    $url = "https://api.watchmode.com/v1/autocomplete-search/?apiKey=$key&search_value=$encoded&search_type=2"
    $response = Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 12
    foreach ($item in @($response.results | Select-Object -First 8)) {
      if ([string]::IsNullOrWhiteSpace([string]$item.name)) { continue }
      $results += [pscustomobject]@{
        id = "watchmode-$($item.id)"
        title = [string]$item.name
        originalTitle = [string]$item.name
        year = Get-YearFromText $item.year
        type = if ([string]$item.tmdb_type -eq "tv") { "tv" } else { "movie" }
        rating = 0
        popularity = [Math]::Min(10, [Math]::Round([double]$item.relevance / 50, 1))
        genres = @("Watchmode")
        posterUrl = if ($null -eq $item.image_url) { "" } else { [string]$item.image_url }
        description = "来自 Watchmode 的在线搜索结果。IMDb: $($item.imdb_id) / TMDb: $($item.tmdb_id)"
        source = "Watchmode"
      }
    }
  } catch {
    Write-AppError "Watchmode search failed: $($_.Exception.Message)"
  }
  return @($results)
}

function Search-OnlineMovies($Query) {
  return @((Search-Tmdb $Query) + (Search-Omdb $Query) + (Search-TvMaze $Query) + (Search-Trakt $Query) + (Search-Watchmode $Query))
}

function Get-MarkedIds {
  $ids = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($bucket in @("watched", "wantToWatch", "skipped")) {
    foreach ($id in @(As-Array $Script:Status[$bucket])) {
      [void]$ids.Add([string]$id)
    }
  }
  return ,$ids
}

function Remove-MovieStatus($MovieId) {
  Push-Undo "remove"
  foreach ($bucket in @("watched", "wantToWatch", "skipped")) {
    $Script:Status[$bucket] = @($Script:Status[$bucket] | Where-Object { $_ -ne $MovieId })
  }
  Save-Status
}

function Mark-Movie($MovieId, $Bucket) {
  Push-Undo "mark"
  foreach ($name in @("watched", "wantToWatch", "skipped")) {
    $Script:Status[$name] = @($Script:Status[$name] | Where-Object { $_ -ne $MovieId })
  }
  $Script:Status[$Bucket] = @($MovieId) + @($Script:Status[$Bucket] | Where-Object { $_ -ne $MovieId })
  Save-Status
}

function Get-Weight($Movie) {
  $weight = ([double]$Movie.rating * 0.6) + ([double]$Movie.popularity * 0.4)
  if ($Script:Settings.onlyHighRated -and [double]$Movie.rating -ge 8) {
    $weight = $weight * 1.15
  }
  return [Math]::Max(0.1, $weight)
}

function Get-RecommendationPool {
  $marked = Get-MarkedIds
  $nowYear = [DateTime]::Now.Year
  return @($Script:Movies | Where-Object {
    $movie = $_
    if (-not $Script:Settings.allowRepeatRecommendations -and $marked.Contains([string]$movie.id)) { return $false }
    if ($Script:Settings.onlyHighRated -and [double]$movie.rating -lt 8) { return $false }
    if ($Script:Filters.type -eq "电影" -and $movie.type -ne "movie") { return $false }
    if ($Script:Filters.type -eq "电视剧" -and $movie.type -ne "tv") { return $false }
    if ($Script:Filters.genre -ne "全部" -and -not @(As-Array $movie.genres).Contains($Script:Filters.genre)) { return $false }
    if ($Script:Filters.minRating -ne "不限" -and [double]$movie.rating -lt [double]$Script:Filters.minRating) { return $false }
    if ($Script:Filters.yearRange -eq "近5年" -and [int]$movie.year -lt ($nowYear - 5)) { return $false }
    if ($Script:Filters.yearRange -eq "近10年" -and [int]$movie.year -lt ($nowYear - 10)) { return $false }
    if ($Script:Filters.yearRange -eq "经典老片" -and [int]$movie.year -ge ($nowYear - 10)) { return $false }
    return $true
  })
}

function Pick-WeightedMovie($Pool) {
  if ($Pool.Count -eq 0) {
    return $null
  }
  $total = 0.0
  foreach ($movie in $Pool) {
    $total += Get-Weight $movie
  }
  $cursor = [Random]::new().NextDouble() * $total
  foreach ($movie in $Pool) {
    $cursor -= Get-Weight $movie
    if ($cursor -le 0) {
      return $movie
    }
  }
  return $Pool[-1]
}

function Refresh-Stats {
  $Script:StatsText.Text = "已看 $($Script:Status.watched.Count)   想看 $($Script:Status.wantToWatch.Count)   跳过 $($Script:Status.skipped.Count)"
  $Script:PoolText.Text = "推荐池：$((Get-RecommendationPool).Count) 部"
}

function Set-Poster($ImageControl, $Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) {
    $ImageControl.Source = $null
    return
  }
  try {
    $bitmap = [Windows.Media.Imaging.BitmapImage]::new()
    $bitmap.BeginInit()
    $bitmap.UriSource = [Uri]$Url
    $bitmap.CacheOption = "OnLoad"
    $bitmap.EndInit()
    $ImageControl.Source = $bitmap
  } catch {
    $ImageControl.Source = $null
  }
}

function Show-CurrentMovie {
  Refresh-Stats
  if ($null -eq $Script:CurrentMovie) {
    $Script:Poster.Source = $null
    $Script:TitleText.Text = "当前筛选条件下没有更多作品了"
    $Script:MetaText.Text = "可以调整筛选或重置推荐池。"
    $Script:GenreText.Text = ""
    $Script:DescriptionText.Text = ""
    $Script:ActionSkip.IsEnabled = $false
    $Script:ActionWant.IsEnabled = $false
    $Script:ActionWatched.IsEnabled = $false
    if ($null -ne $Script:ActionDetail) { $Script:ActionDetail.IsEnabled = $false }
    return
  }
  Set-Poster $Script:Poster $Script:CurrentMovie.posterUrl
  $typeLabel = if ($Script:CurrentMovie.type -eq "movie") { "电影" } else { "电视剧" }
  $Script:TitleText.Text = $Script:CurrentMovie.title
  $Script:MetaText.Text = "$($Script:CurrentMovie.originalTitle) · $($Script:CurrentMovie.year) · $typeLabel · 评分 $($Script:CurrentMovie.rating) · 热度 $($Script:CurrentMovie.popularity)"
  $Script:GenreText.Text = (@(As-Array $Script:CurrentMovie.genres) -join "  ·  ")
  $Script:DescriptionText.Text = $Script:CurrentMovie.description
  $Script:ActionSkip.IsEnabled = $true
  $Script:ActionWant.IsEnabled = $true
  $Script:ActionWatched.IsEnabled = $true
  if ($null -ne $Script:ActionDetail) { $Script:ActionDetail.IsEnabled = $true }
}

function Next-Movie {
  $Script:CurrentMovie = Pick-WeightedMovie (Get-RecommendationPool)
  Show-CurrentMovie
}

function Handle-Action($Bucket) {
  if ($null -eq $Script:CurrentMovie) {
    return
  }
  Mark-Movie $Script:CurrentMovie.id $Bucket
  Next-Movie
}

function Show-View($Name) {
  $Script:SwipeView.Visibility = "Collapsed"
  $Script:LibraryView.Visibility = "Collapsed"
  $Script:SettingsView.Visibility = "Collapsed"
  $Script:StatsView.Visibility = "Collapsed"
  if ($Name -eq "swipe") { $Script:SwipeView.Visibility = "Visible"; Next-Movie }
  if ($Name -eq "library") { $Script:LibraryView.Visibility = "Visible"; Refresh-CustomListCombo; Refresh-Library }
  if ($Name -eq "settings") { $Script:SettingsView.Visibility = "Visible"; Refresh-Stats }
  if ($Name -eq "stats") { $Script:StatsView.Visibility = "Visible"; Refresh-StatsView }
}

function Add-WatchedFromHomeSearch($MovieId) {
  Mark-Movie $MovieId "watched"
  Refresh-Stats
  Refresh-Library
  Refresh-HomeAddResults
}

function Refresh-HomeAddResults {
  if ($null -eq $Script:HomeSearchResultsPanel) {
    return
  }
  $Script:HomeSearchResultsPanel.Children.Clear()
  $query = ""
  if ($null -ne $Script:HomeSearchBox) {
    $query = [string]$Script:HomeSearchBox.Text
  }
  if ([string]::IsNullOrWhiteSpace($query)) {
    $hintText = "搜索电影名称、原名或类型标签，然后加入看过。"
    [void]$Script:HomeSearchResultsPanel.Children.Add((New-Text -Text $hintText -Size 13 -Weight "Normal" -Color "#94A3B8"))
    return
  }
  $needle = $query.Trim().ToLowerInvariant()
  $localResults = @($Script:Movies | Where-Object {
    $haystack = "$($_.title) $($_.originalTitle) $(@(As-Array $_.genres) -join ' ')".ToLowerInvariant()
    $haystack.Contains($needle)
  } | Select-Object -First 8)
  $onlineResults = @(Search-OnlineMovies $query)
  $seen = [System.Collections.Generic.HashSet[string]]::new()
  $results = @()
  foreach ($movie in @($localResults + $onlineResults)) {
    if ($null -eq $movie -or [string]::IsNullOrWhiteSpace([string]$movie.id)) {
      continue
    }
    if ($seen.Add([string]$movie.id)) {
      $results += $movie
    }
  }
  if ([string]::IsNullOrWhiteSpace($Script:Settings.tmdbApiKey) -and [string]::IsNullOrWhiteSpace($Script:Settings.tmdbBearerToken) -and [string]::IsNullOrWhiteSpace($Script:Settings.omdbApiKey) -and [string]::IsNullOrWhiteSpace($Script:Settings.traktClientId) -and [string]::IsNullOrWhiteSpace($Script:Settings.watchmodeApiKey)) {
    [void]$Script:HomeSearchResultsPanel.Children.Add((New-Text -Text "在线搜索已包含 TVMaze；到设置页填写 TMDb / OMDb / Trakt / Watchmode key 后可扩展更多来源。" -Size 12 -Weight "Normal" -Color "#FBBF24"))
  }
  if ($results.Count -eq 0) {
    $emptySearchText = "没有找到匹配作品，可以作为自定义电影加入看过。"
    [void]$Script:HomeSearchResultsPanel.Children.Add((New-Text -Text $emptySearchText -Size 13 -Weight "Normal" -Color "#CBD5E1"))
    $custom = New-Button "添加为看过电影" "#34D399" "#06110D"
    $custom.Width = 240
    $custom.Tag = $query
    $custom.Add_Click({
      Add-CustomWatchedMovie $this.Tag
      $Script:HomeSearchBox.Text = ""
      Refresh-HomeAddResults
    })
    [void]$Script:HomeSearchResultsPanel.Children.Add($custom)
    return
  }
  foreach ($movie in $results) {
    $row = [Windows.Controls.Border]::new()
    $row.Width = 250
    $row.Margin = "0,0,10,10"
    $row.Padding = "10"
    Apply-GlassBorder $row 18
    $stack = [Windows.Controls.StackPanel]::new()
    $source = if ($null -ne $movie.PSObject.Properties["source"] -and -not [string]::IsNullOrWhiteSpace([string]$movie.source)) { [string]$movie.source } else { "本地库" }
    [void]$stack.Children.Add((New-Text $movie.title 14 "SemiBold" "#FFFFFF"))
    [void]$stack.Children.Add((New-Text "$source · $($movie.year) · $($movie.rating) · $(@(As-Array $movie.genres) -join '/')" 12 "Normal" "#94A3B8"))
    $add = New-Button "加入看过" "#34D399" "#06110D"
    $add.Tag = $movie
    $add.Add_Click({
      Add-MovieObjectToCatalog $this.Tag
    })
    [void]$stack.Children.Add($add)
    $row.Child = $stack
    [void]$Script:HomeSearchResultsPanel.Children.Add($row)
  }
}

function Show-MovieRowsInHome($MoviesToShow, $Caption) {
  if ($null -eq $Script:HomeSearchResultsPanel) { return }
  $Script:HomeSearchResultsPanel.Children.Clear()
  [void]$Script:HomeSearchResultsPanel.Children.Add((New-Text -Text $Caption -Size 13 -Weight "SemiBold" -Color "#BDF8FF"))
  foreach ($movie in @($MoviesToShow)) {
    $row = [Windows.Controls.Border]::new()
    $row.Width = 250
    $row.Margin = "0,0,10,10"
    $row.Padding = "10"
    Apply-GlassBorder $row 18
    $stack = [Windows.Controls.StackPanel]::new()
    [void]$stack.Children.Add((New-Text $movie.title 14 "SemiBold" "#FFFFFF"))
    [void]$stack.Children.Add((New-Text "$($movie.year) · $($movie.rating) · $(@(As-Array $movie.genres) -join '/')" 12 "Normal" "#94A3B8"))
    $detail = New-Button "详情" "#22FFFFFF"
    $detail.Tag = $movie
    $detail.Add_Click({ Show-MovieDetailDialog $this.Tag })
    $want = New-Button "加入想看" "#E11D48"
    $want.Tag = [string]$movie.id
    $want.Add_Click({ Mark-Movie $this.Tag "wantToWatch"; Refresh-Stats; Next-Movie })
    [void]$stack.Children.Add($detail)
    [void]$stack.Children.Add($want)
    $row.Child = $stack
    [void]$Script:HomeSearchResultsPanel.Children.Add($row)
  }
}

function Show-DailyRecommendations {
  $today = (Get-Date).ToString("yyyy-MM-dd")
  $daily = Read-JsonFile $Script:DailyFile ([pscustomobject]@{})
  $ids = @()
  if ($null -ne $daily -and $daily.date -eq $today) {
    $ids = @(As-Array $daily.ids)
  }
  if ($ids.Count -eq 0) {
    $pool = @(Get-RecommendationPool)
    $selected = @()
    for ($i = 0; $i -lt 10 -and $pool.Count -gt 0; $i++) {
      $picked = Pick-WeightedMovie $pool
      if ($null -eq $picked) { break }
      $selected += $picked
      $pool = @($pool | Where-Object { $_.id -ne $picked.id })
    }
    $ids = @($selected | ForEach-Object { $_.id })
    Save-JsonFile $Script:DailyFile ([pscustomobject]@{ date = $today; ids = $ids })
  }
  $movies = @($ids | ForEach-Object { Get-MovieById $_ } | Where-Object { $null -ne $_ })
  Show-MovieRowsInHome $movies "今日推荐 10 张：$today"
}

function Get-StatsSummary {
  $watchedMovies = @($Script:Status.watched | ForEach-Object { Get-MovieById $_ } | Where-Object { $null -ne $_ })
  $rated = @($Script:Status.watched | Where-Object { $Script:Reviews.ContainsKey($_) -and $null -ne $Script:Reviews[$_].personalRating })
  $avg = 0
  if ($rated.Count -gt 0) {
    $avg = [Math]::Round((@($rated | ForEach-Object { [double]$Script:Reviews[$_].personalRating }) | Measure-Object -Average).Average, 2)
  }
  $genreCount = @{}
  foreach ($movie in $watchedMovies) {
    foreach ($genre in @(As-Array $movie.genres)) {
      if (-not $genreCount.ContainsKey($genre)) { $genreCount[$genre] = 0 }
      $genreCount[$genre]++
    }
  }
  $topGenres = @($genreCount.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 6 | ForEach-Object { "$($_.Key)($($_.Value))" }) -join "  "
  $decades = @{}
  foreach ($movie in $watchedMovies) {
    $decade = if ([int]$movie.year -gt 0) { ([Math]::Floor([int]$movie.year / 10) * 10).ToString() + "s" } else { "未知" }
    if (-not $decades.ContainsKey($decade)) { $decades[$decade] = 0 }
    $decades[$decade]++
  }
  $yearText = @($decades.GetEnumerator() | Sort-Object Key | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "  "
  $listsText = if ($Script:Lists.Count -eq 0) { "暂无自定义片单" } else { @($Script:Lists.GetEnumerator() | ForEach-Object { "$($_.Key)($(@($_.Value).Count))" }) -join "  " }
  return "已看：$($Script:Status.watched.Count)`n想看：$($Script:Status.wantToWatch.Count)`n跳过：$($Script:Status.skipped.Count)`n平均个人评分：$avg`n最常看的类型：$topGenres`n年份分布：$yearText`n自定义片单：$listsText"
}

function Refresh-StatsView {
  if ($null -eq $Script:StatsPanel) { return }
  $Script:StatsPanel.Children.Clear()
  [void]$Script:StatsPanel.Children.Add((New-Text "个人影视统计" 30 "Bold" "#FFFFFF"))
  [void]$Script:StatsPanel.Children.Add((New-Text (Get-StatsSummary) 16 "Normal" "#CBD5E1"))
  $topRated = @($Script:Status.watched | Where-Object { $Script:Reviews.ContainsKey($_) -and $null -ne $Script:Reviews[$_].personalRating } | Sort-Object { [double]$Script:Reviews[$_].personalRating } -Descending | Select-Object -First 10)
  [void]$Script:StatsPanel.Children.Add((New-Text "个人高分榜" 20 "SemiBold" "#FFFFFF"))
  foreach ($id in $topRated) {
    $movie = Get-MovieById $id
    if ($null -ne $movie) {
      [void]$Script:StatsPanel.Children.Add((New-Text "$($Script:Reviews[$id].personalRating)  $($movie.title) ($($movie.year))" 14 "Normal" "#A7F3D0"))
    }
  }
}

function Refresh-Library {
  try {
    $Script:LibraryPanel.Children.Clear()
    $ids = @(As-Array $Script:Status[$Script:ActiveLibraryTab])
    $items = @($Script:Movies | Where-Object { $ids -contains $_.id })
    if ($null -ne $Script:CustomListCombo) {
      $selectedList = [string]$Script:CustomListCombo.SelectedItem
      if (-not [string]::IsNullOrWhiteSpace($selectedList) -and $selectedList -ne "全部") {
        $listIds = if ($Script:Lists.ContainsKey($selectedList)) { @(As-Array $Script:Lists[$selectedList]) } else { @() }
        $items = @($items | Where-Object { $listIds -contains $_.id })
      }
    }
    $libraryQuery = ""
    if ($null -ne $Script:LibrarySearchBox) {
      $libraryQuery = [string]$Script:LibrarySearchBox.Text
    }
    if (-not [string]::IsNullOrWhiteSpace($libraryQuery)) {
      $needle = $libraryQuery.Trim().ToLowerInvariant()
      $items = @($items | Where-Object {
        $haystack = "$($_.title) $($_.originalTitle) $(@(As-Array $_.genres) -join ' ')".ToLowerInvariant()
        $haystack.Contains($needle)
      })
    }
    $Script:LibraryTitle.Text = if ($Script:ActiveLibraryTab -eq "watched") { "看过" } elseif ($Script:ActiveLibraryTab -eq "wantToWatch") { "想看" } else { "跳过" }
    if ($items.Count -eq 0) {
      $emptyLibraryText = if ([string]::IsNullOrWhiteSpace($libraryQuery)) { "这里还没有作品。" } else { "当前片单里没有匹配作品。" }
      [void]$Script:LibraryPanel.Children.Add((New-Text -Text $emptyLibraryText -Size 18 -Weight "SemiBold" -Color "#CBD5E1"))
      return
    }
    foreach ($movie in $items) {
      $card = [Windows.Controls.Border]::new()
      $card.Width = 178
      $card.Margin = "0,0,14,14"
      $card.Padding = "10"
      Apply-GlassBorder $card 20
      $stack = [Windows.Controls.StackPanel]::new()
      $img = [Windows.Controls.Image]::new()
      $img.Height = 230
      $img.Stretch = "UniformToFill"
      Set-Poster $img $movie.posterUrl
      [void]$stack.Children.Add($img)
      [void]$stack.Children.Add((New-Text $movie.title 15 "SemiBold" "#FFFFFF"))
      [void]$stack.Children.Add((New-Text "$($movie.year) · $($movie.rating)" 12 "Normal" "#94A3B8"))
      $genreLabel = (@(As-Array $movie.genres) | Select-Object -First 3) -join " / "
      [void]$stack.Children.Add((New-Text $genreLabel 12 "Normal" "#CBD5E1"))
      if ($Script:ActiveLibraryTab -eq "watched") {
        $review = Get-MovieReview ([string]$movie.id)
        if ($null -ne $review -and $null -ne $review.personalRating) {
          [void]$stack.Children.Add((New-Text "我的评分：$($review.personalRating)" 12 "SemiBold" "#A7F3D0"))
        }
        if ($null -ne $review -and -not [string]::IsNullOrWhiteSpace([string]$review.review)) {
          [void]$stack.Children.Add((New-Text "影评：$($review.review)" 12 "Normal" "#CBD5E1"))
        }
        $editReview = New-Button "评分 / 影评" "#0F766E"
        $editReview.Tag = $movie
        $editReview.Add_Click({
          try {
            Show-ReviewDialog $this.Tag
          } catch {
            Write-AppError $_.Exception.ToString()
            [Windows.MessageBox]::Show("打开评分/影评窗口失败，错误已写入 app-error.log。", "刷片夹")
          }
        })
        [void]$stack.Children.Add($editReview)
      }
      $detail = New-Button "详情" "#22FFFFFF"
      $detail.Tag = $movie
      $detail.Add_Click({
        try {
          Show-MovieDetailDialog $this.Tag
        } catch {
          Write-AppError $_.Exception.ToString()
          [Windows.MessageBox]::Show("打开详情失败，错误已写入 app-error.log。", "刷片夹")
        }
      })
      [void]$stack.Children.Add($detail)
      $remove = New-Button "移除" "#334155"
      $remove.Tag = [string]$movie.id
      $remove.Add_Click({
        try {
          Remove-MovieStatus $this.Tag
          Refresh-Stats
          Refresh-Library
        } catch {
          Write-AppError $_.Exception.ToString()
          [Windows.MessageBox]::Show("移除失败，错误已写入 app-error.log。", "刷片夹")
        }
      })
      [void]$stack.Children.Add($remove)
      $card.Child = $stack
      [void]$Script:LibraryPanel.Children.Add($card)
    }
  } catch {
    Write-AppError $_.Exception.ToString()
    [Windows.MessageBox]::Show("打开我的片单失败，错误已写入 app-error.log。", "刷片夹")
  }
}

function Refresh-CustomListCombo {
  if ($null -eq $Script:CustomListCombo) { return }
  $current = [string]$Script:CustomListCombo.SelectedItem
  $Script:CustomListCombo.Items.Clear()
  [void]$Script:CustomListCombo.Items.Add("全部")
  foreach ($name in @($Script:Lists.Keys | Sort-Object)) {
    [void]$Script:CustomListCombo.Items.Add($name)
  }
  if (-not [string]::IsNullOrWhiteSpace($current) -and $Script:CustomListCombo.Items.Contains($current)) {
    $Script:CustomListCombo.SelectedItem = $current
  } else {
    $Script:CustomListCombo.SelectedItem = "全部"
  }
}

$window = [Windows.Window]::new()
$window.Title = "刷片夹"
$window.Width = 1180
$window.Height = 760
$window.MinWidth = 980
$window.MinHeight = 680
$window.WindowStartupLocation = "CenterScreen"
$window.Background = New-GradientBrush "#09111F" "#21163E"
$window.Dispatcher.add_UnhandledException({
  param($sender, $eventArgs)
  Write-AppError $eventArgs.Exception.ToString()
  [Windows.MessageBox]::Show("程序遇到一个界面错误，已写入 app-error.log。", "刷片夹")
  $eventArgs.Handled = $true
})

$root = [Windows.Controls.Grid]::new()
$root.Margin = "22"
$root.Background = New-GradientBrush "#09111F" "#161A3A"
$rowHeader = [Windows.Controls.RowDefinition]::new()
$rowHeader.Height = "74"
$rowBody = [Windows.Controls.RowDefinition]::new()
$root.RowDefinitions.Add($rowHeader)
$root.RowDefinitions.Add($rowBody)

$aurora = [Windows.Controls.Canvas]::new()
$aurora.IsHitTestVisible = $false
$aurora.ClipToBounds = $false
[void]$aurora.Children.Add((New-Orb 330 330 "#B8FF6FAE" -70 -58 0.82))
[void]$aurora.Children.Add((New-Orb 310 310 "#AA72F1FF" 850 82 0.75))
[void]$aurora.Children.Add((New-Orb 290 290 "#B07A5CFF" 330 520 0.76))
[void]$aurora.Children.Add((New-Orb 210 210 "#70FFD166" 760 460 0.62))
[Windows.Controls.Grid]::SetRowSpan($aurora, 2)
[Windows.Controls.Panel]::SetZIndex($aurora, 0)
[void]$root.Children.Add($aurora)

$header = [Windows.Controls.Grid]::new()
$header.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
$header.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
$brand = New-Text "刷片夹  Movie Swipe" 24 "Bold" "#FFFFFF"
$Script:StatsText = New-Text "" 15 "SemiBold" "#A7F3D0"
[Windows.Controls.Grid]::SetColumn($brand, 0)
[Windows.Controls.Grid]::SetColumn($Script:StatsText, 1)
$Script:StatsText.HorizontalAlignment = "Right"
$Script:StatsText.VerticalAlignment = "Center"
[void]$header.Children.Add($brand)
[void]$header.Children.Add($Script:StatsText)
[Windows.Controls.Grid]::SetRow($header, 0)
[Windows.Controls.Panel]::SetZIndex($header, 2)
[void]$root.Children.Add($header)

$body = [Windows.Controls.Grid]::new()
$body.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
[Windows.Controls.Grid]::SetRow($body, 1)
[Windows.Controls.Panel]::SetZIndex($body, 2)
[void]$root.Children.Add($body)

$Script:SwipeView = [Windows.Controls.Grid]::new()
$Script:SwipeView.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
$Script:SwipeView.ColumnDefinitions[0].Width = "280"
$Script:SwipeView.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
$Script:SwipeView.ColumnDefinitions[1].Width = "*"
$Script:SwipeView.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new())
$Script:SwipeView.ColumnDefinitions[2].Width = "240"
[void]$body.Children.Add($Script:SwipeView)

$side = [Windows.Controls.StackPanel]::new()
$side.Margin = "0"
[void]$side.Children.Add((New-Text "导航" 14 "SemiBold" "#CBD5E1"))
$toSwipe = New-Button "刷卡推荐" "#FFFFFF" "#111827"
$toLibrary = New-Button "我的片单" "#1F2937"
$toStats = New-Button "统计" "#1F2937"
$toSettings = New-Button "设置" "#1F2937"
$toSwipe.Add_Click({ Show-View "swipe" })
$toLibrary.Add_Click({ Show-View "library" })
$toStats.Add_Click({ Show-View "stats" })
$toSettings.Add_Click({ Show-View "settings" })
[void]$side.Children.Add($toSwipe)
[void]$side.Children.Add($toLibrary)
[void]$side.Children.Add($toStats)
[void]$side.Children.Add($toSettings)
[void]$side.Children.Add((New-Text "筛选" 14 "SemiBold" "#CBD5E1"))
$typeCombo = New-Combo @("全部", "电影", "电视剧") "全部"
$genres = @("全部") + @($Script:Movies | ForEach-Object { As-Array $_.genres } | Sort-Object -Unique)
$genreCombo = New-Combo $genres "全部"
$yearCombo = New-Combo @("全部", "近5年", "近10年", "经典老片") "全部"
$ratingCombo = New-Combo @("不限", "7", "8", "9") "不限"
$Script:PoolText = New-Text "" 13 "Normal" "#94A3B8"
[void]$side.Children.Add((New-Text "作品类型" 12 "Normal" "#94A3B8")); [void]$side.Children.Add($typeCombo)
[void]$side.Children.Add((New-Text "类型标签" 12 "Normal" "#94A3B8")); [void]$side.Children.Add($genreCombo)
[void]$side.Children.Add((New-Text "年份范围" 12 "Normal" "#94A3B8")); [void]$side.Children.Add($yearCombo)
[void]$side.Children.Add((New-Text "最低评分" 12 "Normal" "#94A3B8")); [void]$side.Children.Add($ratingCombo)
[void]$side.Children.Add($Script:PoolText)
$resetButton = New-Button "重置推荐池" "#334155"
$resetButton.Add_Click({
  $Script:Status.watched = @()
  $Script:Status.wantToWatch = @()
  $Script:Status.skipped = @()
  Save-Status
  Next-Movie
})
[void]$side.Children.Add($resetButton)
$undoButton = New-Button "撤销上一步" "#22FFFFFF"
$undoButton.Add_Click({ Undo-LastAction })
[void]$side.Children.Add($undoButton)
$dailyButton = New-Button "今日推荐 10 张" "#7A5CFF"
$dailyButton.Add_Click({ Show-DailyRecommendations })
[void]$side.Children.Add($dailyButton)
[void]$side.Children.Add((New-Text "搜索添加看过" 14 "SemiBold" "#CBD5E1"))
$Script:HomeSearchBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $Script:HomeSearchBox
$Script:HomeSearchBox.Height = 34
$Script:HomeSearchBox.Margin = "0,4,0,6"
$homeSearchButton = New-Button "搜索作品" "#334155"
$homeSearchButton.Add_Click({ Refresh-HomeAddResults })
$Script:HomeSearchBox.Add_KeyDown({
  if ($_.Key -eq "Return") {
    Refresh-HomeAddResults
  }
})
[void]$side.Children.Add($Script:HomeSearchBox)
[void]$side.Children.Add($homeSearchButton)
$homeSearchScroll = [Windows.Controls.ScrollViewer]::new()
$homeSearchScroll.Height = 190
$homeSearchScroll.VerticalScrollBarVisibility = "Auto"
$Script:HomeSearchResultsPanel = [Windows.Controls.WrapPanel]::new()
$homeSearchScroll.Content = $Script:HomeSearchResultsPanel
[void]$side.Children.Add($homeSearchScroll)
[void]$side.Children.Add((New-Text "搜索不到时，可把输入内容作为自定义电影加入看过。" 12 "Normal" "#64748B"))
$sideShell = [Windows.Controls.Border]::new()
$sideShell.Margin = "0,0,20,0"
$sideShell.Padding = "16"
Apply-GlassBorder $sideShell 26
$sideShell.Child = $side
[Windows.Controls.Grid]::SetColumn($sideShell, 0)
[void]$Script:SwipeView.Children.Add($sideShell)

foreach ($combo in @($typeCombo, $genreCombo, $yearCombo, $ratingCombo)) {
  $combo.Add_SelectionChanged({
    $Script:Filters.type = [string]$typeCombo.SelectedItem
    $Script:Filters.genre = [string]$genreCombo.SelectedItem
    $Script:Filters.yearRange = [string]$yearCombo.SelectedItem
    $Script:Filters.minRating = [string]$ratingCombo.SelectedItem
    Next-Movie
  })
}

$center = [Windows.Controls.StackPanel]::new()
$center.HorizontalAlignment = "Center"
$card = [Windows.Controls.Border]::new()
$card.Width = 430
$card.Height = 560
$card.Padding = "18"
Apply-GlassBorder $card 28
$cardStack = [Windows.Controls.StackPanel]::new()
$Script:Poster = [Windows.Controls.Image]::new()
$Script:Poster.Height = 330
$Script:Poster.Stretch = "UniformToFill"
$Script:TitleText = New-Text "" 28 "Bold" "#FFFFFF"
$Script:MetaText = New-Text "" 13 "Normal" "#94A3B8"
$Script:GenreText = New-Text "" 13 "SemiBold" "#A7F3D0"
$Script:DescriptionText = New-Text "" 14 "Normal" "#CBD5E1"
[void]$cardStack.Children.Add($Script:Poster)
[void]$cardStack.Children.Add($Script:TitleText)
[void]$cardStack.Children.Add($Script:MetaText)
[void]$cardStack.Children.Add($Script:GenreText)
[void]$cardStack.Children.Add($Script:DescriptionText)
$card.Child = $cardStack
[void]$center.Children.Add($card)
$actions = [Windows.Controls.Grid]::new()
$actions.Width = 430
$actions.Margin = "0,14,0,0"
for ($i = 0; $i -lt 3; $i++) { $actions.ColumnDefinitions.Add([Windows.Controls.ColumnDefinition]::new()) }
$Script:ActionSkip = New-Button "跳过" "#334155"
$Script:ActionWant = New-Button "想看" "#E11D48"
$Script:ActionWatched = New-Button "看过" "#34D399" "#06110D"
$Script:ActionSkip.Add_Click({ Handle-Action "skipped" })
$Script:ActionWant.Add_Click({ Handle-Action "wantToWatch" })
$Script:ActionWatched.Add_Click({ Handle-Action "watched" })
[Windows.Controls.Grid]::SetColumn($Script:ActionSkip, 0)
[Windows.Controls.Grid]::SetColumn($Script:ActionWant, 1)
[Windows.Controls.Grid]::SetColumn($Script:ActionWatched, 2)
[void]$actions.Children.Add($Script:ActionSkip)
[void]$actions.Children.Add($Script:ActionWant)
[void]$actions.Children.Add($Script:ActionWatched)
[void]$center.Children.Add($actions)
$Script:ActionDetail = New-Button "详情" "#22FFFFFF"
$Script:ActionDetail.Width = 430
$Script:ActionDetail.Add_Click({ Show-MovieDetailDialog $Script:CurrentMovie })
[void]$center.Children.Add($Script:ActionDetail)
[Windows.Controls.Grid]::SetColumn($center, 1)
[void]$Script:SwipeView.Children.Add($center)

$tip = [Windows.Controls.StackPanel]::new()
$tip.Margin = "20,0,0,0"
[void]$tip.Children.Add((New-Text "快捷键" 16 "SemiBold" "#FFFFFF"))
[void]$tip.Children.Add((New-Text "← 跳过`n→ 想看`n↑ 看过" 15 "Normal" "#CBD5E1"))
[void]$tip.Children.Add((New-Text "`n推荐权重 = 评分 × 0.6 + 热度 × 0.4" 13 "Normal" "#94A3B8"))
[Windows.Controls.Grid]::SetColumn($tip, 2)
[void]$Script:SwipeView.Children.Add($tip)

$Script:LibraryView = [Windows.Controls.Grid]::new()
$Script:LibraryView.Visibility = "Collapsed"
$Script:LibraryView.RowDefinitions.Add([Windows.Controls.RowDefinition]::new())
$Script:LibraryView.RowDefinitions[0].Height = "76"
$Script:LibraryView.RowDefinitions.Add([Windows.Controls.RowDefinition]::new())
[void]$body.Children.Add($Script:LibraryView)
$libTop = [Windows.Controls.StackPanel]::new()
$libTop.Orientation = "Horizontal"
$libTop.Margin = "0,0,0,14"
$Script:LibraryTitle = New-Text "看过" 26 "Bold" "#FFFFFF"
[void]$libTop.Children.Add($Script:LibraryTitle)
foreach ($pair in @(@("watched", "看过"), @("wantToWatch", "想看"), @("skipped", "跳过"))) {
  $btn = New-Button $pair[1] "#1F2937"
  $btn.Width = 92
  $btn.Margin = "12,0,0,0"
  $btn.Tag = $pair[0]
  $btn.Add_Click({
    $Script:ActiveLibraryTab = [string]$this.Tag
    Refresh-Library
  })
  [void]$libTop.Children.Add($btn)
}
$back1 = New-Button "回到刷卡" "#FFFFFF" "#111827"
$back1.Width = 120
$back1.Margin = "12,0,0,0"
$back1.Add_Click({ Show-View "swipe" })
[void]$libTop.Children.Add($back1)
[void]$libTop.Children.Add((New-Text "   自定义片单：" 13 "SemiBold" "#CBD5E1"))
$Script:CustomListCombo = New-Combo @("全部") "全部"
$Script:CustomListCombo.Width = 150
$Script:CustomListCombo.Margin = "10,4,0,4"
$Script:CustomListCombo.Add_SelectionChanged({ Refresh-Library })
[void]$libTop.Children.Add($Script:CustomListCombo)
[void]$libTop.Children.Add((New-Text "   搜索已添加：" 13 "SemiBold" "#CBD5E1"))
$Script:LibrarySearchBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $Script:LibrarySearchBox
$Script:LibrarySearchBox.Width = 220
$Script:LibrarySearchBox.Height = 34
$Script:LibrarySearchBox.Margin = "10,4,0,4"
$searchButton = New-Button "搜索" "#334155"
$searchButton.Width = 86
$searchButton.Margin = "8,4,0,4"
$searchButton.Add_Click({ Refresh-Library })
$Script:LibrarySearchBox.Add_KeyDown({
  if ($_.Key -eq "Return") {
    Refresh-Library
  }
})
[void]$libTop.Children.Add($Script:LibrarySearchBox)
[void]$libTop.Children.Add($searchButton)
[Windows.Controls.Grid]::SetRow($libTop, 0)
[void]$Script:LibraryView.Children.Add($libTop)
$scroll = [Windows.Controls.ScrollViewer]::new()
$scroll.VerticalScrollBarVisibility = "Auto"
$Script:LibraryPanel = [Windows.Controls.WrapPanel]::new()
$scroll.Content = $Script:LibraryPanel
[Windows.Controls.Grid]::SetRow($scroll, 1)
[void]$Script:LibraryView.Children.Add($scroll)

$Script:StatsView = [Windows.Controls.ScrollViewer]::new()
$Script:StatsView.Visibility = "Collapsed"
$Script:StatsView.VerticalScrollBarVisibility = "Auto"
$statsShell = [Windows.Controls.Border]::new()
$statsShell.Margin = "0"
$statsShell.Padding = "24"
Apply-GlassBorder $statsShell 28
$Script:StatsPanel = [Windows.Controls.StackPanel]::new()
$statsShell.Child = $Script:StatsPanel
$Script:StatsView.Content = $statsShell
[void]$body.Children.Add($Script:StatsView)

$Script:SettingsView = [Windows.Controls.ScrollViewer]::new()
$Script:SettingsView.Visibility = "Collapsed"
$Script:SettingsView.VerticalScrollBarVisibility = "Auto"
$settingsShell = [Windows.Controls.Border]::new()
$settingsShell.Margin = "0"
$settingsShell.Padding = "24"
Apply-GlassBorder $settingsShell 28
$Script:SettingsPanel = [Windows.Controls.StackPanel]::new()
$settingsShell.Child = $Script:SettingsPanel
$Script:SettingsView.Content = $settingsShell
[void]$body.Children.Add($Script:SettingsView)
[void]$Script:SettingsPanel.Children.Add((New-Text "设置" 28 "Bold" "#FFFFFF"))
$repeatCheck = [Windows.Controls.CheckBox]::new()
$repeatCheck.Content = "允许重复推荐"
$repeatCheck.IsChecked = $Script:Settings.allowRepeatRecommendations
$repeatCheck.Margin = "0,18,0,8"
$repeatCheck.Foreground = New-Brush "#E5E7EB"
$repeatCheck.Add_Click({ $Script:Settings.allowRepeatRecommendations = [bool]$repeatCheck.IsChecked; Save-Settings; Refresh-Stats })
$highCheck = [Windows.Controls.CheckBox]::new()
$highCheck.Content = "只推荐 8 分以上高分作品"
$highCheck.IsChecked = $Script:Settings.onlyHighRated
$highCheck.Margin = "0,8,0,18"
$highCheck.Foreground = New-Brush "#E5E7EB"
$highCheck.Add_Click({ $Script:Settings.onlyHighRated = [bool]$highCheck.IsChecked; Save-Settings; Refresh-Stats })
[void]$Script:SettingsPanel.Children.Add($repeatCheck)
[void]$Script:SettingsPanel.Children.Add($highCheck)
[void]$Script:SettingsPanel.Children.Add((New-Text "在线搜索来源" 18 "SemiBold" "#FFFFFF"))
[void]$Script:SettingsPanel.Children.Add((New-Text "TMDb API Key（v3，可填 API Key 或 Bearer Token 二选一）" 13 "Normal" "#94A3B8"))
$tmdbKeyBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $tmdbKeyBox
$tmdbKeyBox.Height = 32
$tmdbKeyBox.Width = 520
$tmdbKeyBox.HorizontalAlignment = "Left"
$tmdbKeyBox.Margin = "0,4,0,10"
$tmdbKeyBox.Text = $Script:Settings.tmdbApiKey
[void]$Script:SettingsPanel.Children.Add($tmdbKeyBox)
[void]$Script:SettingsPanel.Children.Add((New-Text "TMDb Bearer Token（Read Access Token）" 13 "Normal" "#94A3B8"))
$tmdbBearerBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $tmdbBearerBox
$tmdbBearerBox.Height = 32
$tmdbBearerBox.Width = 520
$tmdbBearerBox.HorizontalAlignment = "Left"
$tmdbBearerBox.Margin = "0,4,0,10"
$tmdbBearerBox.Text = $Script:Settings.tmdbBearerToken
[void]$Script:SettingsPanel.Children.Add($tmdbBearerBox)
[void]$Script:SettingsPanel.Children.Add((New-Text "OMDb API Key（用于 IMDb/OMDb 搜索与评分）" 13 "Normal" "#94A3B8"))
$omdbKeyBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $omdbKeyBox
$omdbKeyBox.Height = 32
$omdbKeyBox.Width = 520
$omdbKeyBox.HorizontalAlignment = "Left"
$omdbKeyBox.Margin = "0,4,0,10"
$omdbKeyBox.Text = $Script:Settings.omdbApiKey
[void]$Script:SettingsPanel.Children.Add($omdbKeyBox)
[void]$Script:SettingsPanel.Children.Add((New-Text "Trakt Client ID（用于 Trakt 搜索）" 13 "Normal" "#94A3B8"))
$traktClientBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $traktClientBox
$traktClientBox.Height = 32
$traktClientBox.Width = 520
$traktClientBox.HorizontalAlignment = "Left"
$traktClientBox.Margin = "0,4,0,10"
$traktClientBox.Text = $Script:Settings.traktClientId
[void]$Script:SettingsPanel.Children.Add($traktClientBox)
[void]$Script:SettingsPanel.Children.Add((New-Text "Watchmode API Key（用于流媒体库与可观看来源）" 13 "Normal" "#94A3B8"))
$watchmodeKeyBox = [Windows.Controls.TextBox]::new()
Apply-InputStyle $watchmodeKeyBox
$watchmodeKeyBox.Height = 32
$watchmodeKeyBox.Width = 520
$watchmodeKeyBox.HorizontalAlignment = "Left"
$watchmodeKeyBox.Margin = "0,4,0,10"
$watchmodeKeyBox.Text = $Script:Settings.watchmodeApiKey
[void]$Script:SettingsPanel.Children.Add($watchmodeKeyBox)
$saveProviderButton = New-Button "保存在线搜索配置" "#34D399" "#06110D"
$saveProviderButton.Width = 180
$saveProviderButton.HorizontalAlignment = "Left"
$saveProviderButton.Add_Click({
  $Script:Settings.tmdbApiKey = [string]$tmdbKeyBox.Text
  $Script:Settings.tmdbBearerToken = [string]$tmdbBearerBox.Text
  $Script:Settings.omdbApiKey = [string]$omdbKeyBox.Text
  $Script:Settings.traktClientId = [string]$traktClientBox.Text
  $Script:Settings.watchmodeApiKey = [string]$watchmodeKeyBox.Text
  Save-Settings
  [Windows.MessageBox]::Show("在线搜索配置已保存。回到首页搜索即可使用。", "刷片夹")
})
[void]$Script:SettingsPanel.Children.Add($saveProviderButton)
$exportButton = New-Button "导出片单 JSON" "#FFFFFF" "#111827"
$exportButton.Width = 180
$exportButton.HorizontalAlignment = "Left"
$exportButton.Add_Click({
  $target = Join-Path $Script:AppDir "movie-library-export.json"
  Save-JsonFile $target ([pscustomobject]$Script:Status)
  [Windows.MessageBox]::Show("已导出到 $target", "刷片夹")
})
$exportAllButton = New-Button "导出完整 JSON" "#FFFFFF" "#111827"
$exportAllButton.Width = 180
$exportAllButton.HorizontalAlignment = "Left"
$exportAllButton.Add_Click({ Export-AllJson })
$exportCsvButton = New-Button "导出看过 CSV" "#FFFFFF" "#111827"
$exportCsvButton.Width = 180
$exportCsvButton.HorizontalAlignment = "Left"
$exportCsvButton.Add_Click({ Export-WatchedCsv })
$backupButton = New-Button "备份全部数据" "#7A5CFF"
$backupButton.Width = 180
$backupButton.HorizontalAlignment = "Left"
$backupButton.Add_Click({ Backup-AppData })
$restoreButton = New-Button "恢复备份" "#334155"
$restoreButton.Width = 180
$restoreButton.HorizontalAlignment = "Left"
$restoreButton.Add_Click({ Restore-AppDataFromFile })
$importTitleButton = New-Button "导入标题列表" "#0F766E"
$importTitleButton.Width = 180
$importTitleButton.HorizontalAlignment = "Left"
$importTitleButton.Add_Click({ Import-TitleListAsWatched })
$back2 = New-Button "回到刷卡" "#334155"
$back2.Width = 180
$back2.HorizontalAlignment = "Left"
$back2.Add_Click({ Show-View "swipe" })
[void]$Script:SettingsPanel.Children.Add($exportButton)
[void]$Script:SettingsPanel.Children.Add($exportAllButton)
[void]$Script:SettingsPanel.Children.Add($exportCsvButton)
[void]$Script:SettingsPanel.Children.Add($backupButton)
[void]$Script:SettingsPanel.Children.Add($restoreButton)
[void]$Script:SettingsPanel.Children.Add($importTitleButton)
[void]$Script:SettingsPanel.Children.Add($back2)
[void]$Script:SettingsPanel.Children.Add((New-Text "`n已预留：真实影视 API、豆瓣片单导入、CSV 导出、个人评分、私人备注和行为权重。" 14 "Normal" "#94A3B8"))

$window.Add_KeyDown({
  if ($_.Key -eq "Left") { Handle-Action "skipped" }
  if ($_.Key -eq "Right") { Handle-Action "wantToWatch" }
  if ($_.Key -eq "Up") { Handle-Action "watched" }
})

$window.Content = $root
Next-Movie
if ($TestLibrary) {
  Show-View "library"
  "OK: library view rendered."
  exit 0
}
if ($TestStats) {
  Show-View "stats"
  "OK: stats view rendered."
  exit 0
}
[void]$window.ShowDialog()

